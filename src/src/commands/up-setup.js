const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('../utils/database');
const { buildUPEmbed } = require('../utils/upPanel');

const REP_ROLE_ID     = '1505984896743637133';
const VICE_REP_ROLE_ID = '1505986264984191056';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('up-setup')
    .setDescription('🏆 Crea il pannello fisso degli Ultimate Points in questo canale')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('canale')
        .setDescription('Canale dove pubblicare il pannello UP')
        .setRequired(true)
    ),

  async execute(interaction) {
    const member = interaction.member;
    const hasRole = member.roles.cache.has(REP_ROLE_ID) || member.roles.cache.has(VICE_REP_ROLE_ID);

    if (!hasRole && !member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('❌ Non Autorizzato')
          .setDescription('Solo **Rep** e **Vice Rep** possono usare questo comando.')
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    const canale = interaction.options.getChannel('canale');
    const db = readDB();

    // Inizializza struttura UP se non esiste
    if (!db.up) {
      db.up = { messageId: null, channelId: null, scores: {} };
    }

    // Sincronizza server registrati: aggiunge quelli mancanti con 0 punti
    for (const [, srv] of Object.entries(db.servers)) {
      if (!(srv.nome in db.up.scores)) {
        db.up.scores[srv.nome] = 0;
      }
    }

    const embed = buildUPEmbed(db);
    const msg = await canale.send({ embeds: [embed] });

    db.up.messageId  = msg.id;
    db.up.channelId  = canale.id;
    writeDB(db);

    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('✅ Pannello UP Creato')
        .setDescription(`Il pannello degli Ultimate Points è stato pubblicato in <#${canale.id}>.\nSi aggiornerà automaticamente ad ogni modifica con \`/up-aggiungi\` e \`/up-rimuovi\`.`)
        .setFooter({ text: 'SkyForce Ultimate Chain' })
        .setTimestamp()
      ],
      ephemeral: true
    });
  }
};
