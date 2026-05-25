const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType } = require('discord.js');
const { readDB, writeDB } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rimuovi-server')
    .setDescription('➖ Rimuove un server dalla chain SkyForce Ultimate')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const db = readDB();
    const servers = Object.entries(db.servers);

    if (servers.length === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('❌ Nessun server')
          .setDescription('Non ci sono server nella chain. Aggiungine uno con `/aggiungi-server`.')
        ],
        ephemeral: true
      });
    }

    const options = servers.map(([key, srv]) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(srv.nome)
        .setDescription(`Owner: ${srv.ownerTag}`)
        .setValue(key)
        .setEmoji('🏠')
    );

    const menu = new StringSelectMenuBuilder()
      .setCustomId('rimuovi_select')
      .setPlaceholder('Seleziona il server da rimuovere...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    const embed = new EmbedBuilder()
      .setColor(0xFF8800)
      .setTitle('🗑️ Rimuovi Server dalla Chain')
      .setDescription('Seleziona il server che vuoi rimuovere dalla chain SkyForce Ultimate.')
      .setFooter({ text: 'SkyForce Ultimate Chain' });

    const reply = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 30000
    });

    collector.on('collect', async i => {
      const key = i.values[0];
      const srv = db.servers[key];
      const nomeSrv = srv.nome;

      delete db.servers[key];
      writeDB(db);

      await i.update({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('✅ Server Rimosso')
          .setDescription(`Il server **${nomeSrv}** è stato rimosso dalla chain.`)
          .setFooter({ text: 'SkyForce Ultimate Chain' })
          .setTimestamp()
        ],
        components: []
      });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  }
};
