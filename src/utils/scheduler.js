const cron = require('node-cron');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readDB } = require('../utils/database');

/**
 * Ogni domenica alle 10:00 ora italiana manda il reminder.
 * Cron: '0 10 * * 0' = domenica alle 10:00 UTC+1 (quindi le 09:00 UTC, che in estate è 08:00 UTC)
 * 
 * Per gestire correttamente l'orario italiano usiamo '0 9 * * 0' (UTC)
 * che corrisponde alle 10:00 CET (UTC+1) o 11:00 CEST (UTC+2 in estate)
 * 
 * NOTA: Render usa UTC. Il reminder viene inviato alle 10:00 ora italiana.
 */

function startReminderScheduler(client) {
  // Domenica alle 10:00 ora italiana (09:00 UTC in inverno / 08:00 UTC in estate)
  // Usiamo una cron expression che controlla ogni ora la domenica e calcola l'ora italiana
  cron.schedule('0 8,9 * * 0', async () => {
    // Controllo preciso dell'ora italiana
    const now = new Date();
    const oraItaliana = new Intl.DateTimeFormat('it-IT', {
      hour: 'numeric',
      timeZone: 'Europe/Rome'
    }).format(now);

    if (oraItaliana !== '10') return; // Invia solo alle 10:00 italiane

    await sendReminder(client);
  });

  // Secondo reminder: domenica alle 17:00 ora italiana (ultimo avviso prima delle 18:00)
  cron.schedule('0 15,16 * * 0', async () => {
    const now = new Date();
    const oraItaliana = new Intl.DateTimeFormat('it-IT', {
      hour: 'numeric',
      timeZone: 'Europe/Rome'
    }).format(now);

    if (oraItaliana !== '17') return; // Invia solo alle 17:00 italiane

    await sendFinalReminder(client);
  });

  console.log('✅ Scheduler reminder domenicale attivo.');
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

  const servers = Object.entries(db.servers);
  const ownerMentions = servers.length > 0
    ? servers.map(([, s]) => `<@${s.ownerId}>`).join(' ')
    : '';

  const embed = new EmbedBuilder()
    .setColor(0x00D4FF)
    .setTitle('📋 Reminder Resoconto Settimanale')
    .setDescription(
      `📣 ${ownerMentions}\n\n` +
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

  await channel.send({ embeds: [embed], components: [button] });
  console.log('📬 Reminder domenicale inviato.');
}

async function sendFinalReminder(client) {
  const db = readDB();

  if (!db.reminderChannel) return;

  const channel = await client.channels.fetch(db.reminderChannel).catch(() => null);
  if (!channel) return;

  const servers = Object.entries(db.servers);
  const ownerMentions = servers.length > 0
    ? servers.map(([, s]) => `<@${s.ownerId}>`).join(' ')
    : '';

  const embed = new EmbedBuilder()
    .setColor(0xFF8800)
    .setTitle('⚠️ Ultimo Avviso — 1 ora alla scadenza!')
    .setDescription(
      `⚠️ ${ownerMentions}\n\n` +
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

  await channel.send({ embeds: [embed], components: [button] });
  console.log('⚠️ Ultimo avviso domenicale inviato.');
}

module.exports = { startReminderScheduler };
