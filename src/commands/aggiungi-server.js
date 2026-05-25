const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('../utils/database');

const MAX_OWNERS = 3;

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
      opt.setName('owner1')
        .setDescription('Owner / responsabile principale del server')
        .setRequired(true))
    .addUserOption(opt =>
      opt.setName('owner2')
        .setDescription('2° owner (opzionale)')
        .setRequired(false))
    .addUserOption(opt =>
      opt.setName('owner3')
        .setDescription('3° owner (opzionale)')
        .setRequired(false))
    .addStringOption(opt =>
      opt.setName('id_server')
        .setDescription('ID Discord del server (opzionale, per riferimento)')
        .setRequired(false)),

  async execute(interaction) {
    const nome     = interaction.options.getString('nome');
    const owner1   = interaction.options.getUser('owner1');
    const owner2   = interaction.options.getUser('owner2');
    const owner3   = interaction.options.getUser('owner3');
    const idServer = interaction.options.getString('id_server') || 'Non specificato';

    // Raccoglie gli owner unici passati
    const owners = [owner1, owner2, owner3].filter(Boolean);
    const uniqueOwners = [...new Map(owners.map(u => [u.id, u])).values()];

    const db = readDB();

    // Controlla che nessun owner sia già assegnato ad un altro server
    for (const owner of uniqueOwners) {
      for (const [key, srv] of Object.entries(db.servers)) {
        const ids = Array.isArray(srv.ownerIds) ? srv.ownerIds : [srv.ownerId];
        if (ids.includes(owner.id)) {
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
    }

    const serverKey = nome.toLowerCase().replace(/\s+/g, '-');
    db.servers[serverKey] = {
      nome,
      // Supporta sia il vecchio campo singolo che il nuovo array
      ownerId:  uniqueOwners[0].id,
      ownerTag: uniqueOwners[0].tag,
      ownerIds: uniqueOwners.map(u => u.id),
      ownerTags: uniqueOwners.map(u => u.tag),
      discordId: idServer,
      aggiuntoIl: new Date().toISOString()
    };

    writeDB(db);

    const ownerList = uniqueOwners.map((u, idx) =>
      `${['👑','🥈','🥉'][idx]} <@${u.id}>`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0x00D4FF)
      .setTitle('✅ Server Aggiunto alla Chain')
      .addFields(
        { name: '🏠 Server',      value: `**${nome}**`,      inline: true },
        { name: '🆔 ID Server',   value: `\`${idServer}\``,  inline: true },
        { name: `👑 Owner${uniqueOwners.length > 1 ? 's' : ''} (${uniqueOwners.length}/${MAX_OWNERS})`, value: ownerList, inline: false },
      )
      .setFooter({ text: 'SkyForce Ultimate Chain' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
