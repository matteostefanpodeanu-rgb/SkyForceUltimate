const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Configurazione ────────────────────────────────────────────────────────────
// Variabili d'ambiente da impostare su Render → Environment:
//
//   GITHUB_TOKEN   → Personal Access Token (classic, scope: repo)
//   GITHUB_OWNER   → tuo username GitHub  es. matteostefanpodeanu-rgb
//   GITHUB_REPO    → nome del repo         es. SkyForceUltimate
//   GITHUB_DB_PATH → percorso del file nel repo  es. data/db.json
//
// Il bot legge il DB da GitHub all'avvio e lo salva su GitHub ad ogni writeDB.

const GITHUB_TOKEN   = process.env.GITHUB_TOKEN;
const GITHUB_OWNER   = process.env.GITHUB_OWNER;
const GITHUB_REPO    = process.env.GITHUB_REPO;
const GITHUB_DB_PATH = process.env.GITHUB_DB_PATH || 'data/db.json';

// Percorso locale (cache in memoria durante l'esecuzione)
const LOCAL_PATH = path.join(__dirname, '../../data/db.json');

const DB_DEFAULT = {
  servers: {},
  resocontoChannel: null,
  reminderChannel: null,
  valutazioniChannel: null,
  logChannel: null,
  up: {
    messageId: null,
    channelId: null,
    scores: {}
  },
  valutazioni: []
};

// ── Cache in-memory ───────────────────────────────────────────────────────────
// Evita chiamate GitHub ad ogni readDB() — si aggiorna solo su writeDB()
let memoryCache = null;

// ── Helpers GitHub API ────────────────────────────────────────────────────────

function githubConfigured() {
  return GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO;
}

/**
 * Chiamata generica all'API GitHub (Promise).
 */
function githubRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SkyForceUltimate-Bot',
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Legge il db.json direttamente da GitHub.
 * Restituisce { content, sha } oppure null se non esiste.
 */
async function fetchFromGitHub() {
  try {
    const res = await githubRequest('GET', `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_DB_PATH}`);
    if (res.status === 200) {
      const content = Buffer.from(res.body.content, 'base64').toString('utf-8');
      return { data: JSON.parse(content), sha: res.body.sha };
    }
    return null;
  } catch (err) {
    console.error('[DB] Errore fetch GitHub:', err.message);
    return null;
  }
}

/**
 * Scrive il db.json su GitHub (crea o aggiorna).
 * sha è necessario per aggiornare un file esistente.
 */
async function pushToGitHub(data, sha) {
  try {
    const content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64');
    const body = {
      message: `[bot] aggiornamento db ${new Date().toISOString()}`,
      content,
      ...(sha ? { sha } : {})
    };
    const res = await githubRequest('PUT', `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_DB_PATH}`, body);
    if (res.status === 200 || res.status === 201) {
      return res.body.content.sha; // sha aggiornato
    }
    console.error('[DB] GitHub push fallito:', res.status, JSON.stringify(res.body));
    return sha;
  } catch (err) {
    console.error('[DB] Errore push GitHub:', err.message);
    return sha;
  }
}

// ── SHA cache (per non rifetchare ad ogni write) ───────────────────────────────
let currentSha = null;

// ── Funzioni pubbliche ────────────────────────────────────────────────────────

/**
 * Inizializza il DB: scarica da GitHub e popola la cache locale.
 * Va chiamata una volta all'avvio (in ready.js).
 */
async function initDB() {
  if (!githubConfigured()) {
    console.warn('[DB] Variabili GitHub non configurate — uso DB locale (i dati si perderanno al deploy).');
    try {
      const raw = fs.readFileSync(LOCAL_PATH, 'utf-8');
      memoryCache = { ...DB_DEFAULT, ...JSON.parse(raw) };
    } catch {
      memoryCache = { ...DB_DEFAULT };
    }
    return;
  }

  console.log(`[DB] Caricamento da GitHub: ${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_DB_PATH}`);
  const result = await fetchFromGitHub();
  if (result) {
    memoryCache = { ...DB_DEFAULT, ...result.data };
    currentSha  = result.sha;
    console.log(`[DB] ✅ DB caricato da GitHub (${Object.keys(memoryCache.servers).length} server)`);
  } else {
    console.warn('[DB] File non trovato su GitHub, uso default vuoto.');
    memoryCache = { ...DB_DEFAULT };
    // Crea il file su GitHub
    currentSha = await pushToGitHub(memoryCache, null);
  }

  // Salva anche localmente come backup
  ensureLocalDir();
  fs.writeFileSync(LOCAL_PATH, JSON.stringify(memoryCache, null, 2), 'utf-8');
}

/**
 * Lettura sincrona dalla cache in-memory.
 */
function readDB() {
  if (memoryCache) return { ...DB_DEFAULT, ...memoryCache };

  // Fallback se initDB non è stato ancora chiamato
  console.warn('[DB] readDB chiamato prima di initDB — lettura da disco locale.');
  try {
    const raw = fs.readFileSync(LOCAL_PATH, 'utf-8');
    return { ...DB_DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DB_DEFAULT };
  }
}

/**
 * Scrittura: aggiorna cache locale + disco + GitHub (asincrono).
 */
function writeDB(data) {
  // 1. Aggiorna cache in-memory subito (sincrono, il bot non aspetta)
  memoryCache = data;

  // 2. Salva su disco locale come backup
  ensureLocalDir();
  try {
    fs.writeFileSync(LOCAL_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DB] Errore scrittura locale:', err.message);
  }

  // 3. Push su GitHub in background (non blocca il bot)
  if (githubConfigured()) {
    pushToGitHub(data, currentSha)
      .then(newSha => { currentSha = newSha; })
      .catch(err => console.error('[DB] Push GitHub fallito:', err.message));
  }
}

function ensureLocalDir() {
  const dir = path.dirname(LOCAL_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getDBPath() {
  return githubConfigured()
    ? `GitHub: ${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_DB_PATH}`
    : `Locale: ${LOCAL_PATH}`;
}

module.exports = { initDB, readDB, writeDB, getDBPath };
