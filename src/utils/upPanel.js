const { EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('./database');

const MEDAGLIE = ['🥇', '🥈', '🥉'];

function buildUPEmbed(db) {
  const scores  = db.up?.scores || {};
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const now = new Date();
  const dataOra = now.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Rome'
  });

  // ── Riga separatore visivo ─────────────────────────────────────────────────
  const SEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━';

  let descrizione = `${SEP}\n\n`;

  if (entries.length === 0) {
    descrizione += '*Nessun server ancora registrato.*\n\n';
  } else {
    entries.forEach(([nome, punti], i) => {
      const medaglia   = i < 3 ? MEDAGLIE[i] : `**${i + 1}.**`;
      const puntiFmt   = punti > 0
        ? `🟢  **+${punti} UP**`
        : punti < 0
          ? `🔴  **${punti} UP**`
          : `⚪  **0 UP**`;
      descrizione += `${medaglia}  ${nome}\n`;
      descrizione += `╰ ${puntiFmt}\n\n`;
    });
  }

  descrizione += SEP;

  const leader = entries[0];
  const ultimo = entries[entries.length - 1];

  const embed = new EmbedBuilder()
    .setColor(0xF5A623)
    .setTitle('🏆  CLASSIFICA ULTIMATE POINTS')
    .setDescription(descrizione)
    .addFields(
      {
        name: '📊  Server in classifica',
        value: `\`\`\`${entries.length}\`\`\``,
        inline: true
      },
      {
        name: '🥇  Leader',
        value: entries.length > 0
          ? `\`\`\`${leader[0]}\n${leader[1]} UP\`\`\``
          : '```—```',
        inline: true
      },
      {
        name: '🔻  Ultimo',
        value: entries.length > 1
          ? `\`\`\`${ultimo[0]}\n${ultimo[1]} UP\`\`\``
          : '```—```',
        inline: true
      }
    )
    .setFooter({ text: `SkyForce Ultimate Chain  •  Aggiornato il ${dataOra}` });

  return embed;
}

async function aggiornaUPPanel(client) {
  const db = readDB();
  if (!db.up?.messageId || !db.up?.channelId) return false;

  try {
    const channel = await client.channels.fetch(db.up.channelId);
    const message = await channel.messages.fetch(db.up.messageId);
    await message.edit({ embeds: [buildUPEmbed(db)] });
    return true;
  } catch (err) {
    console.error('[UP Panel] Errore aggiornamento:', err.message);
    return false;
  }
}

module.exports = { buildUPEmbed, aggiornaUPPanel };
