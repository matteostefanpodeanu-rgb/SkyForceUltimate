const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-log')
    .setDescription('🛠️ Imposta il canale dove il bot invia i log di sistema')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('canale')
        .setDescription('Il canale dove inviare i log')
        .setRequired(true)),

  async execute(interaction) {
    const canale = interaction.options.getChannel('canale');
    const db = readDB();

    db.logChannel = canale.id;
    writeDB(db);

    const embed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle('✅ Canale Log Configurato')
      .setDescription(
        `I log di sistema verranno inviati in <#${canale.id}>.\n\n` +
        `**Cosa viene loggato:**\n` +
        `🟢 Avvio e connessione del bot\n` +
        `🔴 Spegnimento o disconnessione\n` +
        `🚀 Deploy e riavvii\n` +
        `💥 Errori critici e crash\n` +
        `⚠️ Warning e problemi minori\n` +
        `⌨️ Utilizzo dei comandi slash\n` +
        `📋 Info generali di sistema`
      )
      .setFooter({ text: 'SkyForce Ultimate Chain' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Primo messaggio nel canale log
    const logger = require('../utils/logger');
    await logger.avvio('Canale Log Attivato', `Il sistema di log è stato configurato da <@${interaction.user.id}>.`);
  }
};
