const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readDB } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lista-server')
    .setDescription('📋 Mostra tutti i server della chain SkyForce Ultimate')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const db = readDB();
    const servers = Object.entries(db.servers);

    const embed = new EmbedBuilder()
      .setColor(0x00D4FF)
      .setTitle('🌐 SkyForce Ultimate — Server della Chain')
      .setFooter({ text: `Totale: ${servers.length} server` })
      .setTimestamp();

    if (servers.length === 0) {
      embed.setDescription('Nessun server nella chain. Usa `/aggiungi-server` per iniziare.');
    } else {
      const desc = servers.map(([, srv], i) =>
        `**${i + 1}.** 🏠 **${srv.nome}**\n` +
        `   👑 Owner: <@${srv.ownerId}> (\`${srv.ownerTag}\`)\n` +
        `   🆔 ID: \`${srv.discordId}\``
      ).join('\n\n');
      embed.setDescription(desc);
    }

    if (db.resocontoChannel) {
      embed.addFields({ name: '📬 Canale Resoconti', value: `<#${db.resocontoChannel}>`, inline: true });
    }
    if (db.reminderChannel) {
      embed.addFields({ name: '🔔 Canale Reminder', value: `<#${db.reminderChannel}>`, inline: true });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
