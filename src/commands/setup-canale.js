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
          { name: '📋 Canale Resoconti — dove arrivano i resoconti settimanali',     value: 'resoconto'    },
          { name: '📊 Canale Valutazioni — dove arrivano le valutazioni settimanali', value: 'valutazione'  },
          { name: '🔔 Canale Reminder — dove il bot manda il reminder domenicale',    value: 'reminder'     }
        ))
    .addChannelOption(opt =>
      opt.setName('canale')
        .setDescription('Il canale da impostare')
        .setRequired(true))
    .addRoleOption(opt =>
      opt.setName('ruolo_ping')
        .setDescription('Ruolo da pingare nei reminder (solo per il canale reminder)')
        .setRequired(false)),

  async execute(interaction) {
    const tipo      = interaction.options.getString('tipo');
    const canale    = interaction.options.getChannel('canale');
    const ruoloPing = interaction.options.getRole('ruolo_ping');

    const db = readDB();

    if (tipo === 'resoconto') {
      db.resocontoChannel = canale.id;
    } else if (tipo === 'valutazione') {
      db.valutazioneChannel = canale.id;
    } else {
      db.reminderChannel = canale.id;
      if (ruoloPing) db.reminderPingRole = ruoloPing.id;
    }

    writeDB(db);

    const nomi = {
      resoconto:   '📋 Canale Resoconti',
      valutazione: '📊 Canale Valutazioni',
      reminder:    '🔔 Canale Reminder'
    };

    let desc = `**${nomi[tipo]}** impostato su <#${canale.id}>`;
    if (tipo === 'reminder' && ruoloPing) {
      desc += `\n🏷️ **Ruolo ping:** <@&${ruoloPing.id}>`;
    } else if (tipo === 'reminder' && db.reminderPingRole) {
      desc += `\n🏷️ **Ruolo ping attuale:** <@&${db.reminderPingRole}>`;
    }

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('✅ Canale Configurato')
        .setDescription(desc)
        .setFooter({ text: 'SkyForce Ultimate Chain' })
        .setTimestamp()
      ],
      ephemeral: true
    });
  }
};
