const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aggiungi-server')
    .setDescription('➕ Aggiunge un server alla chain SkyForce Ultimate')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('nome')
        .setDescription('Nome del server da aggiungere')
        .setRequired(true))
    .addUserOption(opt =>
      opt.setName('owner')
        .setDescription('Utente owner/responsabile di questo server')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('id_server')
        .setDescription('ID Discord del server (opzionale, per riferimento)')
        .setRequired(false)),

  async execute(interaction) {
    const nome = interaction.options.getString('nome');
    const owner = interaction.options.getUser('owner');
    const idServer = interaction.options.getString('id_server') || 'Non specificato';

    const db = readDB();

    // Controlla se l'utente è già assegnato a un server
    for (const [key, srv] of Object.entries(db.servers)) {
      if (srv.ownerId === owner.id) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF4444)
            .setTitle('❌ Errore')
            .setDescription(`**${owner.tag}** è già assegnato al server **${srv.nome}**.\nRimuovilo prima con \`/rimuovi-server\`.`)
          ],
          ephemeral: true
        });
      }
    }

    const serverKey = nome.toLowerCase().replace(/\s+/g, '-');
    db.servers[serverKey] = {
      nome,
      ownerId: owner.id,
      ownerTag: owner.tag,
      discordId: idServer,
      aggiuntoIl: new Date().toISOString()
    };

    writeDB(db);

    const embed = new EmbedBuilder()
      .setColor(0x00D4FF)
      .setTitle('✅ Server Aggiunto alla Chain')
      .setThumbnail('https://cdn.discordapp.com/embed/avatars/0.png')
      .addFields(
        { name: '🏠 Server', value: `**${nome}**`, inline: true },
        { name: '👑 Owner', value: `<@${owner.id}>`, inline: true },
        { name: '🆔 ID Server', value: `\`${idServer}\``, inline: true },
      )
      .setFooter({ text: 'SkyForce Ultimate Chain' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
