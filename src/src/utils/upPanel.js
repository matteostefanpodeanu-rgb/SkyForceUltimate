const { EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('./database');

function buildUPEmbed(db) {
  const scores  = db.up?.scores || {};
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const now = new Date();
  const dataOra = now.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Rome'
  });

  const MEDAGLIE = ['🥇', '🥈', '🥉'];

  // Metriche header
  const leader = entries.length > 0 ? entries[0][0] : '—';
  const totalServer = entries.length;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🏆 Ultimate Points')
    .setDescription(`**SkyForce Ultimate Chain**`)
    .addFields(
      { name: '🏅 Leader',         value: `**${leader}**`,       inline: true },
      { name: '🏠 Server attivi',  value: `**${totalServer}**`,  inline: true },
      { name: '\u200b',            value: '\u200b',               inline: true }
    );

  if (entries.length === 0) {
    embed.addFields({ name: 'Classifica', value: '*Nessun server ancora registrato.*', inline: false });
  } else {
    for (let i = 0; i < entries.length; i++) {
      const [nome, punti] = entries[i];
      const medaglia = i < 3 ? MEDAGLIE[i] : `**${i + 1}.**`;
      const puntiFmt = punti > 0 ? `+${punti} UP` : `${punti} UP`;
      const emoji    = punti > 0 ? '🟢' : punti < 0 ? '🔴' : '⚪';
      embed.addFields({
        name:   `${medaglia} ${nome}`,
        value:  `${emoji} **${puntiFmt}**`,
        inline: true
      });
    }
    // Padding per allineare a 3 colonne
    const rest = entries.length % 3;
    if (rest === 1) {
      embed.addFields(
        { name: '\u200b', value: '\u200b', inline: true },
        { name: '\u200b', value: '\u200b', inline: true }
      );
    } else if (rest === 2) {
      embed.addFields({ name: '\u200b', value: '\u200b', inline: true });
    }
  }

  embed.setFooter({ text: `SkyForce Ultimate Chain • Aggiornato il ${dataOra}` });
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
