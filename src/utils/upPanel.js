const { EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('./database');

// ── Palette viola ─────────────────────────────────────────────────────────────
const C_VIOLA       = 0x9B59B6;   // viola principale
const C_VIOLA_LIGHT = 0xBB8FCE;   // viola chiaro (accento)
const C_GOLD        = 0xF1C40F;   // oro podio
const C_RED         = 0xE74C3C;
const C_GREEN       = 0x2ECC71;

const MEDAGLIE = ['🥇', '🥈', '🥉'];
const SEP      = '▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰';
const SEP_THIN = '─────────────────────────────';

function buildUPEmbed(db) {
  const scores  = db.up?.scores || {};
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const now = new Date();
  const dataOra = now.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Rome'
  });

  let descrizione = `${SEP}\n\n`;

  if (entries.length === 0) {
    descrizione += '> *Nessun server ancora registrato.*\n\n';
  } else {
    entries.forEach(([nome, punti], i) => {
      const medaglia = i < 3 ? MEDAGLIE[i] : `\`${i + 1}.\``;
      const bar      = buildBar(punti, entries[0][1]);
      const puntiFmt = punti > 0
        ? `**+${punti} UP**  ${bar}`
        : punti < 0
          ? `**${punti} UP**`
          : `**0 UP**`;
      const prefix = i === 0 ? '👑 ' : '';
      descrizione += `${medaglia}  ${prefix}${nome}\n`;
      descrizione += `╰ 🔮  ${puntiFmt}\n`;
      if (i < entries.length - 1) descrizione += `\n`;
    });
  }

  descrizione += `\n${SEP}`;

  const leader = entries[0];
  const ultimo = entries[entries.length - 1];
  const gap    = entries.length >= 2 ? leader[1] - entries[1][1] : 0;

  const embed = new EmbedBuilder()
    .setColor(C_VIOLA)
    .setTitle('🏆  CLASSIFICA ULTIMATE POINTS')
    .setDescription(descrizione)
    .addFields(
      {
        name: '📊  Server',
        value: `\`\`\`${entries.length}\`\`\``,
        inline: true
      },
      {
        name: '👑  Leader',
        value: entries.length > 0
          ? `\`\`\`${leader[0]}\n${leader[1]} UP\`\`\``
          : '```—```',
        inline: true
      },
      {
        name: '📉  Ultimo',
        value: entries.length > 1
          ? `\`\`\`${ultimo[0]}\n${ultimo[1]} UP\`\`\``
          : '```—```',
        inline: true
      }
    )
    .setFooter({ text: `SkyForce Ultimate Chain  •  Aggiornato il ${dataOra}` });

  return embed;
}

// Barra progresso testuale (max 8 blocchi)
function buildBar(punti, max) {
  if (!max || max <= 0) return '';
  const filled = Math.round((punti / max) * 8);
  const empty  = 8 - filled;
  return '`' + '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty)) + '`';
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

module.exports = { buildUPEmbed, aggiornaUPPanel, C_VIOLA, C_VIOLA_LIGHT, C_GOLD, C_RED, C_GREEN, SEP, SEP_THIN };
