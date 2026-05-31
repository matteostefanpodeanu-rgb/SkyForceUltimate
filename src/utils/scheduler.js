const cron = require('node-cron');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readDB } = require('../utils/database');

function startReminderScheduler(client) {
  // 10:00 ora italiana
  cron.schedule('0 8,9 * * 0', async () => {
    const oraItaliana = new Intl.DateTimeFormat('it-IT', {
      hour: 'numeric', timeZone: 'Europe/Rome'
    }).format(new Date());
    if (oraItaliana !== '10') return;
    await sendReminder(client);
  });

  // 17:00 ora italiana
  cron.schedule('0 15,16 * * 0', async () => {
    const oraItaliana = new Intl.DateTimeFormat('it-IT', {
      hour: 'numeric', timeZone: 'Europe/Rome'
    }).format(new Date());
    if (oraItaliana !== '17') return;
    await sendFinalReminder(client);
  });

  console.log('✅ Scheduler reminder domenicale attivo.');
}

// Costruisce il ping: ruolo di ogni server + eventuali owner senza ruolo
function buildPingString(db) {
  const parts = [];
  const servers = Object.entries(db.servers);

  if (servers.length > 0) {
    for (const [, s] of servers) {
      if (s.roleId) {
        // Pinga il ruolo del server
        parts.push(`<@&${s.roleId}>`);
      } else {
        // Fallback: pinga gli owner individualmente se non c'è il ruolo
        const ids = Array.isArray(s.ownerIds) ? s.ownerIds : [s.ownerId];
        ids.forEach(id => parts.push(`<@${id}>`));
      }
    }
  }

  return parts.join(' ');
}

async function sendReminder(client) {
  const db = readDB();

  if (!db.reminderChannel) {
    console.log('⚠️ Canale reminder non configurato. Usa /setup-canale.');
    return;
  }

  const channel = await client.channels.fetch(db.reminderChannel).catch(() => null);
  if (!channel) {
    console.log('⚠️ Canale reminder non trovato.');
    return;
  }

  const pingString = buildPingString(db);

  const embed = new EmbedBuilder()
    .setColor(0x00D4FF)
    .setTitle('📋 Reminder Resoconto Settimanale')
    .setDescription(
      `**Buona domenica, SkyForce Ultimate!** 🚀\n\n` +
      `È ora di compilare il **resoconto settimanale**!\n\n` +
      `Ogni owner deve compilare il proprio resoconto entro:\n` +
      `> ⏰ **Oggi, domenica, ore 18:00** (ora italiana)\n\n` +
      `Usa il comando:\n` +
      `> 📊 \`/resoconto\`\n\n` +
      `*Riporta le partnership effettuate, la valutazione dell'attività e i tuoi piani di miglioramento.*`
    )
    .setFooter({ text: 'SkyForce Ultimate Chain • Reminder Domenicale' })
    .setTimestamp();

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('apri_resoconto_reminder')
      .setLabel('📊 Compila il Resoconto')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({
    content: pingString || undefined,
    embeds: [embed],
    components: [button]
  });

  console.log('📬 Reminder domenicale inviato.');
}

async function sendFinalReminder(client) {
  const db = readDB();

  if (!db.reminderChannel) return;

  const channel = await client.channels.fetch(db.reminderChannel).catch(() => null);
  if (!channel) return;

  const pingString = buildPingString(db);

  const embed = new EmbedBuilder()
    .setColor(0xFF8800)
    .setTitle('⚠️ Ultimo Avviso — 1 ora alla scadenza!')
    .setDescription(
      `Manca **solo 1 ora** alla scadenza del resoconto settimanale!\n\n` +
      `> ⏰ Scadenza: **ore 18:00** (ora italiana)\n\n` +
      `Se non hai ancora compilato il tuo resoconto, fallo subito con \`/resoconto\`!\n\n` +
      `⚡ **Non perdere la scadenza!**`
    )
    .setFooter({ text: 'SkyForce Ultimate Chain • Ultimo Avviso' })
    .setTimestamp();

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('apri_resoconto_reminder')
      .setLabel('📊 Compila Ora!')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: pingString || undefined,
    embeds: [embed],
    components: [button]
  });

  console.log('⚠️ Ultimo avviso domenicale inviato.');
}

module.exports = { startReminderScheduler };
