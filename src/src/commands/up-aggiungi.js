const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readDB, writeDB } = require('../utils/database');
const { aggiornaUPPanel } = require('../utils/upPanel');

const REP_ROLE_ID      = '1505984896743637133';
const VICE_REP_ROLE_ID = '1505986264984191056';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('up-aggiungi')
    .setDescription('➕ Aggiungi Ultimate Points a un server della chain')
    .addStringOption(opt =>
      opt.setName('server')
        .setDescription('Nome del server a cui aggiungere i punti')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(opt =>
      opt.setName('punti')
        .setDescription('Quantità di UP da aggiungere')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(9999)
    )
    .addStringOption(opt =>
      opt.setName('motivo')
        .setDescription('Motivo dell\'assegnazione (opzionale)')
        .setRequired(false)
        .setMaxLength(200)
    ),

  async autocomplete(interaction) {
    const db = readDB();
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = Object.values(db.servers)
      .map(s => ({ name: s.nome, value: s.nome }))
      .filter(c => c.name.toLowerCase().includes(focused))
      .slice(0, 25);
    await interaction.respond(choices);
  },

  async execute(interaction) {
    const member = interaction.member;
    const hasRole = member.roles.cache.has(REP_ROLE_ID) || member.roles.cache.has(VICE_REP_ROLE_ID);

    if (!hasRole) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('❌ Non Autorizzato')
          .setDescription('Solo **Rep** e **Vice Rep** possono gestire gli Ultimate Points.')
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    const nomeServer = interaction.options.getString('server');
    const punti      = interaction.options.getInteger('punti');
    const motivo     = interaction.options.getString('motivo') || null;

    const db = readDB();
    if (!db.up) db.up = { messageId: null, channelId: null, scores: {} };

    const serverEsiste = Object.values(db.servers).some(s => s.nome === nomeServer);
    if (!serverEsiste) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('❌ Server Non Trovato')
          .setDescription(`Il server **${nomeServer}** non è registrato nella chain.\nUsa \`/aggiungi-server\` prima.`)
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    const precedenti = db.up.scores[nomeServer] ?? 0;
    db.up.scores[nomeServer] = precedenti + punti;
    writeDB(db);

    const aggiornato = await aggiornaUPPanel(interaction.client);

    const embed = new EmbedBuilder()
      .setColor(0x00FF88)
      .setTitle('✅ Ultimate Points Aggiunti')
      .addFields(
        { name: '🏠 Server',       value: `**${nomeServer}**`,             inline: true },
        { name: '➕ Punti Aggiunti', value: `**+${punti} UP**`,             inline: true },
        { name: '🏆 Totale',       value: `**${db.up.scores[nomeServer]} UP**`, inline: true },
      )
      .setFooter({ text: `SkyForce Ultimate Chain • ${aggiornato ? 'Pannello aggiornato ✓' : 'Pannello non trovato, usa /up-setup'}` })
      .setTimestamp();

    if (motivo) embed.addFields({ name: '📝 Motivo', value: motivo, inline: false });

    await interaction.reply({ embeds: [embed] });
  }
};
