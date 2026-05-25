const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// ─── Validazione variabili d'ambiente ───────────────────────────────────────
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN mancante nelle variabili d\'ambiente!');
  process.exit(1);
}

// ─── Creazione client ───────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

client.commands = new Collection();

// ─── Caricamento comandi ────────────────────────────────────────────────────
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`📦 Comando caricato: /${command.data.name}`);
  }
}

// ─── Caricamento eventi ─────────────────────────────────────────────────────
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`📡 Evento caricato: ${event.name}`);
}

// ─── Evento disconnessione ──────────────────────────────────────────────────
client.on('disconnect', () => {
  logger.spegnimento('Bot Disconnesso', 'Il bot si è disconnesso da Discord.');
});

client.on('shardError', async (error) => {
  await logger.errore('Errore WebSocket', `\`\`\`${error.message}\`\`\``);
});

// ─── Login ──────────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('🚀 SkyForce Ultimate avviato!'))
  .catch(async err => {
    console.error('❌ Errore nel login:', err.message);
    process.exit(1);
  });

// ─── Errori non gestiti (crash) ──────────────────────────────────────────────
process.on('unhandledRejection', async (error) => {
  console.error('⚠️ Unhandled Promise Rejection:', error);
  await logger.errore(
    'Unhandled Promise Rejection',
    `\`\`\`${String(error).slice(0, 800)}\`\`\``
  );
});

process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught Exception:', error);
  await logger.errore(
    'Uncaught Exception — CRASH',
    `\`\`\`${error.message}\`\`\``,
    [{ name: '🔍 Stack', value: `\`\`\`${(error.stack || '').slice(0, 800)}\`\`\`` }]
  );
  // Piccola attesa per dare tempo all'embed di essere inviato prima del crash
  setTimeout(() => process.exit(1), 2000);
});

// ─── Log spegnimento pulito (SIGTERM da Render) ──────────────────────────────
process.on('SIGTERM', async () => {
  console.log('🔴 SIGTERM ricevuto — spegnimento in corso...');
  await logger.spegnimento(
    'Bot Spento (SIGTERM)',
    'Render ha richiesto lo spegnimento del bot. Probabilmente è in corso un nuovo deploy.'
  );
  setTimeout(() => process.exit(0), 2000);
});

process.on('SIGINT', async () => {
  console.log('🔴 SIGINT ricevuto — spegnimento manuale.');
  await logger.spegnimento('Bot Spento Manualmente', 'Il bot è stato fermato manualmente.');
  setTimeout(() => process.exit(0), 2000);
});

// ─── Mini server HTTP per UptimeRobot ───────────────────────────────────────
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('SkyForce Ultimate è online!');
}).listen(process.env.PORT || 3000, () => {
  console.log('🌐 Server HTTP attivo per UptimeRobot');
});
