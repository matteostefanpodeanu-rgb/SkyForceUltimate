const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-minimo')
    .setDescription('⚙️ Imposta il minimo di partnership settimanali richieste')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(opt =>
      opt.setName('minimo')
        .setDescription('Numero minimo di partnership settimanali (default: 35)')
        .setMinValue(1)
        .setMaxValue(500)
        .setRequired(true)
    ),

  async execute(interaction) {
    const minimo = interaction.options.getInteger('minimo');
    const db = readDB();
    const vecchio = db.minimoPartnership ?? 35;

    db.minimoPartnership = minimo;
    writeDB(db);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle('⚙️ Minimo Partnership Aggiornato')
        .addFields(
          { name: '📌 Vecchio minimo', value: `**${vecchio}** partnership`, inline: true },
          { name: '📌 Nuovo minimo',   value: `**${minimo}** partnership`,  inline: true },
        )
        .setDescription(
          `\n**Tabella UP aggiornata:**\n` +
          `> 0–9 partner → **-6 UP**\n` +
          `> 10–24 partner → **-5 UP**\n` +
          `> 25–34 partner → **-4 UP**\n` +
          `> ${minimo}+ partner → **+8 UP** (base)\n` +
          `> Bonus extra per chi supera il minimo.`
        )
        .setFooter({ text: 'SkyForce Ultimate Chain' })
        .setTimestamp()
      ],
      ephemeral: false
    });
  }
};
