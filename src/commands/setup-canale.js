const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-canale')
    .setDescription('⚙️ Configura i canali del bot SkyForce')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('tipo')
        .setDescription('Tipo di canale da configurare')
        .setRequired(true)
        .addChoices(
          { name: '📋 Canale Resoconti — dove vengono inviati i resoconti compilati', value: 'resoconto' },
          { name: '🔔 Canale Reminder — dove il bot manda il reminder domenicale',    value: 'reminder'  }
        ))
    .addChannelOption(opt =>
      opt.setName('canale')
        .setDescription('Il canale da impostare')
        .setRequired(true))
    .addRoleOption(opt =>
      opt.setName('ruolo_ping')
        .setDescription('Ruolo da pingare nei reminder (opzionale)')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const tipo      = interaction.options.getString('tipo');
    const canale    = interaction.options.getChannel('canale');
    const ruoloPing = interaction.options.getRole('ruolo_ping');

    const db = readDB();

    if (tipo === 'resoconto') {
      db.resocontoChannel = canale.id;
    } else {
      db.reminderChannel = canale.id;
      if (ruoloPing) db.reminderPingRole = ruoloPing.id;
    }

    writeDB(db);

    const nomi = {
      resoconto: '📋 Canale Resoconti',
      reminder:  '🔔 Canale Reminder'
    };

    let desc = `**${nomi[tipo]}** impostato su <#${canale.id}>`;
    if (tipo === 'reminder' && ruoloPing) {
      desc += `\n🏷️ **Ruolo ping reminder:** <@&${ruoloPing.id}>`;
    } else if (tipo === 'reminder' && db.reminderPingRole) {
      desc += `\n🏷️ **Ruolo ping attuale:** <@&${db.reminderPingRole}>`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle('✅ Canale Configurato')
      .setDescription(desc)
      .setFooter({ text: 'SkyForce Ultimate Chain' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
