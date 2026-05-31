const cron = require('node-cron');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readDB } = require('../utils/database');
const { C_VIOLA, C_RED, SEP } = require('../utils/upPanel');

function startReminderScheduler(client) {
  cron.schedule('0 8,9 * * 0', async () => {
    const oraItaliana = new Intl.DateTimeFormat('it-IT', {
      hour: 'numeric', timeZone: 'Europe/Rome'
    }).format(new Date());
    if (oraItaliana !== '10') return;
    await sendReminder(client);
  });

  cron.schedule('0 15,16 * * 0', async () => {
    const oraItaliana = new Intl.DateTimeFormat('it-IT', {
      hour: 'numeric', timeZone: 'Europe/Rome'
    }).format(new Date());
    if (oraItaliana !== '17') return;
    await sendFinalReminder(client);
  });

  console.log('✅ Scheduler reminder domenicale attivo.');
}

function buildPingString(db) {
  const parts = [];
  for (const [, s] of Object.entries(db.servers)) {
    if (s.roleId) {
      parts.push(`<@&${s.roleId}>`);
    } else {
      const ids = Array.isArray(s.ownerIds) ? s.ownerIds : [s.ownerId];
      ids.forEach(id => parts.push(`<@${id}>`));
    }
  }
  return parts.join(' ');
}

async function sendReminder(client) {
  const db = readDB();
  if (!db.reminderChannel) return;
  const channel = await client.channels.fetch(db.reminderChannel).catch(() => null);
  if (!channel) return;

  const pingString = buildPingString(db);
  const minimo     = db.minimoPartnership ?? 35;

  const embed = new EmbedBuilder()
    .setColor(C_VIOLA)
    .setTitle('📋  Reminder — Resoconto Settimanale')
    .setDescription(
      `${SEP}\n\n` +
      `🚀  **Buona domenica, SkyForce Ultimate!**\n\n` +
      `È il momento di compilare il **resoconto settimanale**.\n` +
      `Ogni owner deve inviarlo entro le **ore 18:00**.\n\n` +
      `${SEP}\n\n` +
      `> ⏰  Scadenza: **oggi, domenica — ore 18:00** (IT)\n` +
      `> 🤝  Minimo partnership: **${minimo}**\n` +
      `> 📊  Comando: \`/resoconto\`\n\n` +
      `${SEP}`
    )
    .setFooter({ text: 'SkyForce Ultimate Chain  •  Reminder Domenicale' })
    .setTimestamp();

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('apri_resoconto_reminder')
      .setLabel('📊  Compila il Resoconto')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ content: pingString || undefined, embeds: [embed], components: [button] });
  console.log('📬 Reminder domenicale inviato.');
}

async function sendFinalReminder(client) {
  const db = readDB();
  if (!db.reminderChannel) return;
  const channel = await client.channels.fetch(db.reminderChannel).catch(() => null);
  if (!channel) return;

  const pingString = buildPingString(db);

  const embed = new EmbedBuilder()
    .setColor(C_RED)
    .setTitle('⚠️  ULTIMO AVVISO — 1 ora alla scadenza!')
    .setDescription(
      `${SEP}\n\n` +
      `🔴  Manca **solo 1 ora** alla scadenza!\n\n` +
      `> ⏰  Scadenza: **ore 18:00** (ora italiana)\n\n` +
      `Se non hai ancora compilato il resoconto,\n` +
      `fallo **subito** con \`/resoconto\`!\n\n` +
      `${SEP}`
    )
    .setFooter({ text: 'SkyForce Ultimate Chain  •  Ultimo Avviso' })
    .setTimestamp();

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('apri_resoconto_reminder')
      .setLabel('⚡  Compila Ora!')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ content: pingString || undefined, embeds: [embed], components: [button] });
  console.log('⚠️ Ultimo avviso domenicale inviato.');
}

module.exports = { startReminderScheduler };
