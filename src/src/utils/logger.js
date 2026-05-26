const { EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('./database');

// Client Discord salvato al momento del ready
let _client = null;

function setClient(client) {
  _client = client;
}

// Tipi di log con colori e emoji
const TYPES = {
  AVVIO:    { color: 0x00FF88, emoji: '🟢' },
  SPEGNIMENTO: { color: 0xFF4444, emoji: '🔴' },
  ERRORE:   { color: 0xFF0000, emoji: '💥' },
  WARNING:  { color: 0xFF8800, emoji: '⚠️' },
  COMANDO:  { color: 0x00D4FF, emoji: '⌨️' },
  INFO:     { color: 0x8888FF, emoji: '📋' },
  DEPLOY:   { color: 0xFFD700, emoji: '🚀' },
};

async function log(tipo, titolo, descrizione = null, extra = []) {
  // Stampa sempre su console
  console.log(`[${tipo}] ${titolo}${descrizione ? ' — ' + descrizione : ''}`);

  if (!_client) return;

  const db = readDB();
  if (!db.logChannel) return;

  try {
    const channel = await _client.channels.fetch(db.logChannel).catch(() => null);
    if (!channel) return;

    const t = TYPES[tipo] || TYPES.INFO;

    // Ora italiana
    const ora = new Date().toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Europe/Rome'
    });

    const embed = new EmbedBuilder()
      .setColor(t.color)
      .setTitle(`${t.emoji} ${titolo}`)
      .setFooter({ text: `SkyForce Ultimate • ${ora}` });

    if (descrizione) embed.setDescription(descrizione);

    if (extra.length > 0) {
      embed.addFields(extra);
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error('[LOGGER] Errore invio log:', err.message);
  }
}

// Shorthand per i tipi più comuni
const logger = {
  setClient,
  avvio:       (titolo, desc, extra) => log('AVVIO', titolo, desc, extra),
  spegnimento: (titolo, desc, extra) => log('SPEGNIMENTO', titolo, desc, extra),
  errore:      (titolo, desc, extra) => log('ERRORE', titolo, desc, extra),
  warning:     (titolo, desc, extra) => log('WARNING', titolo, desc, extra),
  comando:     (titolo, desc, extra) => log('COMANDO', titolo, desc, extra),
  info:        (titolo, desc, extra) => log('INFO', titolo, desc, extra),
  deploy:      (titolo, desc, extra) => log('DEPLOY', titolo, desc, extra),
};

module.exports = logger;
