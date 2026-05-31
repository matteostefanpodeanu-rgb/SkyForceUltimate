const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { readDB } = require('../utils/database');
const { C_VIOLA, C_RED, C_GREEN, SEP } = require('../utils/upPanel');

const COLORI_VALUTAZIONE = {
  'SCARSA':      0xE74C3C,
  'SUFFICIENTE': 0xE67E22,
  'BUONA':       0x2ECC71,
  'OTTIMA':      C_VIOLA
};
const LABEL_VALUTAZIONE = {
  'SCARSA':      '🔴  SCARSA',
  'SUFFICIENTE': '🟡  SUFFICIENTE',
  'BUONA':       '🟢  BUONA',
  'OTTIMA':      '🌟  OTTIMA'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resoconto')
    .setDescription('📊 Compila il resoconto settimanale del tuo server'),

  async execute(interaction) {
    const db = readDB();

    const serverEntries = Object.entries(db.servers).filter(([, srv]) =>
      Array.isArray(srv.ownerIds)
        ? srv.ownerIds.includes(interaction.user.id)
        : srv.ownerId === interaction.user.id
    );

    if (serverEntries.length === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(C_RED)
          .setTitle('❌  Non Autorizzato')
          .setDescription(`${SEP}\n\nNon sei associato a nessun server della chain.\nContatta un amministratore.\n\n${SEP}`)
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    if (!db.resocontoChannel) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xE67E22)
          .setTitle('⚠️  Configurazione Mancante')
          .setDescription(`${SEP}\n\nIl canale resoconti non è configurato.\nChiedi a un admin di usare \`/setup-canale\`.\n\n${SEP}`)
        ],
        ephemeral: true
      });
    }

    const [, serverData] = serverEntries[0];
    const minimo = db.minimoPartnership ?? 35;

    // ── Step 1 ───────────────────────────────────────────────────────────────
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(C_VIOLA)
        .setTitle('📊  Resoconto Settimanale')
        .setDescription(
          `${SEP}\n\n` +
          `👋  Ciao **${interaction.user.username}**!\n\n` +
          `🏠  Server: **${serverData.nome}**\n` +
          `📌  Minimo partnership: **${minimo}**\n\n` +
          `${SEP}\n\n` +
          `Clicca il bottone per iniziare.`
        )
        .setFooter({ text: 'SkyForce Ultimate Chain  •  Resoconto Settimanale' })
        .setTimestamp()
      ],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`apri_modal_${interaction.user.id}`)
          .setLabel('📝  Inizia Resoconto')
          .setStyle(ButtonStyle.Primary)
      )],
      ephemeral: true
    });

    let btnInteraction;
    try {
      btnInteraction = await interaction.channel.awaitMessageComponent({
        filter: i => i.customId === `apri_modal_${interaction.user.id}` && i.user.id === interaction.user.id,
        time: 120000
      });
    } catch {
      await interaction.editReply({ components: [] }).catch(() => {});
      return;
    }

    // ── Modal 1: Partnership ─────────────────────────────────────────────────
    const modal1 = new ModalBuilder()
      .setCustomId(`partnership_modal_${interaction.user.id}`)
      .setTitle('Resoconto — Partnership');

    modal1.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('partnership')
          .setLabel('Partnership fatte questa settimana?')  // 38 char ✅
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(`Es: 42  (minimo: ${minimo})`)
          .setMinLength(1)
          .setMaxLength(4)
          .setRequired(true)
      )
    );

    await btnInteraction.showModal(modal1);
    await interaction.editReply({ components: [] }).catch(() => {});

    let modalSubmit1;
    try {
      modalSubmit1 = await btnInteraction.awaitModalSubmit({
        time: 300000,
        filter: m => m.customId === `partnership_modal_${interaction.user.id}` && m.user.id === interaction.user.id
      });
    } catch {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(C_RED).setTitle('⏰  Tempo Scaduto').setDescription('Riusa `/resoconto` per ricominciare.')],
        components: []
      }).catch(() => {});
      return;
    }

    const partnership = modalSubmit1.fields.getTextInputValue('partnership').trim();
    const partNum     = parseInt(partnership) || 0;
    const soglia      = partNum >= minimo ? `✅  sopra il minimo` : `⚠️  sotto il minimo (${minimo})`;

    // ── Step 2: Valutazione ──────────────────────────────────────────────────
    await modalSubmit1.reply({
      embeds: [new EmbedBuilder()
        .setColor(C_VIOLA)
        .setTitle('📊  Resoconto — Step 2/3')
        .setDescription(
          `${SEP}\n\n` +
          `🤝  Partnership dichiarate: **${partnership}**  —  ${soglia}\n\n` +
          `${SEP}\n\n` +
          `Come valuti l'attività del tuo server questa settimana?`
        )
        .setFooter({ text: 'SkyForce Ultimate Chain  •  Resoconto Settimanale' })
        .setTimestamp()
      ],
      components: [new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`attivita_${interaction.user.id}`)
          .setPlaceholder('Seleziona la valutazione...')
          .addOptions([
            new StringSelectMenuOptionBuilder().setLabel('🔴 SCARSA')      .setDescription('Poca attività, pochi progressi').setValue('SCARSA'),
            new StringSelectMenuOptionBuilder().setLabel('🟡 SUFFICIENTE') .setDescription('Attività nella media, da migliorare').setValue('SUFFICIENTE'),
            new StringSelectMenuOptionBuilder().setLabel('🟢 BUONA')       .setDescription('Buona attività, obiettivi raggiunti').setValue('BUONA'),
            new StringSelectMenuOptionBuilder().setLabel('🌟 OTTIMA')      .setDescription('Settimana eccellente, grandi risultati!').setValue('OTTIMA'),
          ])
      )],
      ephemeral: true
    });

    let selectInteraction;
    try {
      selectInteraction = await interaction.channel.awaitMessageComponent({
        filter: i => i.customId === `attivita_${interaction.user.id}` && i.user.id === interaction.user.id,
        time: 120000
      });
    } catch {
      await modalSubmit1.editReply({ components: [] }).catch(() => {});
      return;
    }

    const valutazione = selectInteraction.values[0];

    // ── Modal 2: Miglioramento ───────────────────────────────────────────────
    const modal2 = new ModalBuilder()
      .setCustomId(`miglioramento_modal_${interaction.user.id}`)
      .setTitle('Resoconto — Miglioramento');

    modal2.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('miglioramento')
          .setLabel('Cosa farai per migliorare? (opzionale)')  // 40 char ✅
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Descrivi i tuoi piani per la prossima settimana...')
          .setMaxLength(1000)
          .setRequired(false)
      )
    );

    await selectInteraction.showModal(modal2);
    await modalSubmit1.editReply({ components: [] }).catch(() => {});

    let modalSubmit2;
    try {
      modalSubmit2 = await selectInteraction.awaitModalSubmit({
        time: 300000,
        filter: m => m.customId === `miglioramento_modal_${interaction.user.id}` && m.user.id === interaction.user.id
      });
    } catch {
      await modalSubmit1.editReply({
        embeds: [new EmbedBuilder().setColor(C_RED).setTitle('⏰  Tempo Scaduto').setDescription('Riusa `/resoconto` per ricominciare.')],
        components: []
      }).catch(() => {});
      return;
    }

    const miglioramento = modalSubmit2.fields.getTextInputValue('miglioramento').trim();

    // Defer prima di operazioni pesanti
    await modalSubmit2.deferReply({ ephemeral: true });

    // ── Embed finale ─────────────────────────────────────────────────────────
    const now = new Date();
    const dataItaliana = now.toLocaleDateString('it-IT', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Europe/Rome'
    });
    const oraItaliana = now.toLocaleTimeString('it-IT', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'
    });

    const colore = COLORI_VALUTAZIONE[valutazione] ?? C_VIOLA;

    const resocontoEmbed = new EmbedBuilder()
      .setColor(colore)
      .setTitle(`📊  Resoconto Settimanale — ${serverData.nome}`)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `${SEP}\n\n` +
        `🏠  **${serverData.nome}**\n` +
        `👑  <@${interaction.user.id}>\n` +
        `📅  ${dataItaliana} alle **${oraItaliana}**\n\n` +
        `${SEP}`
      )
      .addFields(
        { name: '🤝  Partnership Effettuate', value: `**${partnership}** questa settimana`, inline: true },
        { name: '📈  Valutazione',            value: `**${LABEL_VALUTAZIONE[valutazione] ?? valutazione}**`, inline: true }
      )
      .setFooter({ text: 'SkyForce Ultimate Chain  •  Resoconto Settimanale' })
      .setTimestamp();

    if (miglioramento.length > 0) {
      resocontoEmbed.addFields({
        name: '💡  Piano di Miglioramento',
        value: miglioramento.slice(0, 1024),
        inline: false
      });
    }

    const canaleResoconto = await interaction.guild.channels.fetch(db.resocontoChannel).catch(() => null);
    if (canaleResoconto) await canaleResoconto.send({ embeds: [resocontoEmbed] });

    await modalSubmit2.editReply({
      embeds: [new EmbedBuilder()
        .setColor(C_GREEN)
        .setTitle('✅  Resoconto Inviato!')
        .setDescription(
          `${SEP}\n\n` +
          `Il resoconto per **${serverData.nome}** è stato inviato con successo!\n\n` +
          `🤝  Partnership: **${partnership}**\n` +
          `📊  Valutazione: **${LABEL_VALUTAZIONE[valutazione] ?? valutazione}**\n\n` +
          `${SEP}`
        )
        .setFooter({ text: 'SkyForce Ultimate Chain' })
        .setTimestamp()
      ]
    });
  }
};
