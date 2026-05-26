const { EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('./database');

const MEDAGLIE = ['🥇', '🥈', '🥉'];

function buildUPEmbed(db) {
  const scores = db.up?.scores || {};
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const now = new Date();
  const dataOra = now.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Rome'
  });

  let descrizione = '';

  if (entries.length === 0) {
    descrizione = '*Nessun server ancora registrato.*';
  } else {
    entries.forEach(([nome, punti], i) => {
      const medaglia = i < 3 ? MEDAGLIE[i] : `**${i + 1}.**`;
      const puntiFmt = punti > 0
        ? `🟢 **+${punti}**`
        : punti < 0
          ? `🔴 **${punti}**`
          : `⚪ **0**`;
      const separatore = i < entries.length - 1 ? '\n' : '';
      descrizione += `${medaglia} ${nome} ${'\u2014'} ${puntiFmt} UP${separatore}`;
    });
  }

  const embed = new EmbedBuilder()
    .setColor(0xF5A623)
    .setTitle('🏆 CLASSIFICA ULTIMATE POINTS — SkyForce Ultimate')
    .setDescription(descrizione)
    .addFields(
      { name: '📊 Server in classifica', value: `**${entries.length}**`, inline: true },
      {
        name: '🥇 Leader',
        value: entries.length > 0 ? `**${entries[0][0]}** con ${entries[0][1]} UP` : '—',
        inline: true
      },
      {
        name: '🔻 Ultimo',
        value: entries.length > 1
          ? `**${entries[entries.length - 1][0]}** con ${entries[entries.length - 1][1]} UP`
          : '—',
        inline: true
      }
    )
    .setFooter({ text: `SkyForce Ultimate Chain • Aggiornato il ${dataOra}` });

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
