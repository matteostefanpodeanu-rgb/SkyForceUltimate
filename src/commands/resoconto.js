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
          .setColor(0xFF4444)
          .setTitle('❌ Non Autorizzato')
          .setDescription('Non sei associato a nessun server della chain.\nContatta un amministratore per essere aggiunto.')
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    if (!db.resocontoChannel) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF8800)
          .setTitle('⚠️ Configurazione Mancante')
          .setDescription('Il canale dei resoconti non è stato configurato.\nChiedi a un amministratore di usare `/setup-canale`.')
        ],
        ephemeral: true
      });
    }

    const [, serverData] = serverEntries[0];

    // ── Step 1: Mostra bottone "Inizia Resoconto" ───────────────────────────
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle('📊 Resoconto Settimanale — SkyForce Ultimate')
        .setDescription(
          `Benvenuto **${interaction.user.username}**!\n\n` +
          `Stai compilando il resoconto per:\n` +
          `🏠 **${serverData.nome}**\n\n` +
          `**Step 1/3** — Clicca per inserire le partnership.`
        )
        .setFooter({ text: 'SkyForce Ultimate Chain • Resoconto Settimanale' })
        .setTimestamp()
      ],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`apri_modal_${interaction.user.id}`)
          .setLabel('📝 Inizia Resoconto')
          .setStyle(ButtonStyle.Primary)
      )],
      ephemeral: true
    });

    // ── Aspetta click bottone ───────────────────────────────────────────────
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

    // ── Modal 1: Partnership ────────────────────────────────────────────────
    const modal1 = new ModalBuilder()
      .setCustomId(`partnership_modal_${interaction.user.id}`)
      .setTitle('Resoconto — Partnership');

    modal1.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('partnership')
          // FIX: era 46 caratteri, limite Discord = 45
          .setLabel('Partnership fatte questa settimana?')  // 38 char ✅
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Es: 3')
          .setMinLength(1)
          .setMaxLength(4)
          .setRequired(true)
      )
    );

    await btnInteraction.showModal(modal1);

    // Rimuovi il bottone dal messaggio originale
    await interaction.editReply({ components: [] }).catch(() => {});

    // ── Aspetta submit Modal 1 ──────────────────────────────────────────────
    let modalSubmit1;
    try {
      modalSubmit1 = await btnInteraction.awaitModalSubmit({
        time: 300000,
        filter: m => m.customId === `partnership_modal_${interaction.user.id}` && m.user.id === interaction.user.id
      });
    } catch {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF4444).setTitle('⏰ Tempo Scaduto').setDescription('Riusa `/resoconto` per ricominciare.')],
        components: []
      }).catch(() => {});
      return;
    }

    const partnership = modalSubmit1.fields.getTextInputValue('partnership').trim();

    // ── Step 2: Menu valutazione ────────────────────────────────────────────
    await modalSubmit1.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle('📊 Resoconto Settimanale — SkyForce Ultimate')
        .setDescription(
          `**Step 2/3** — Come reputi l'attività del tuo server?\n\n` +
          `🤝 Partnership: **${partnership}**`
        )
        .setFooter({ text: 'SkyForce Ultimate Chain • Resoconto Settimanale' })
        .setTimestamp()
      ],
      components: [new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`attivita_${interaction.user.id}`)
          .setPlaceholder('Seleziona la valutazione...')
          .addOptions([
            new StringSelectMenuOptionBuilder().setLabel('🔴 SCARSA')      .setDescription('Poca attività, pochi progressi').setValue('SCARSA'),
            // FIX: era 47 caratteri, limite = 45
            new StringSelectMenuOptionBuilder().setLabel('🟡 SUFFICIENTE') .setDescription('Attività nella media, da migliorare').setValue('SUFFICIENTE'),  // 36 char ✅
            new StringSelectMenuOptionBuilder().setLabel('🟢 BUONA')       .setDescription('Buona attività, obiettivi raggiunti').setValue('BUONA'),
            new StringSelectMenuOptionBuilder().setLabel('🌟 OTTIMA')      .setDescription('Settimana eccellente, grandi risultati!').setValue('OTTIMA'),
          ])
      )],
      ephemeral: true
    });

    // ── Aspetta selezione menu ──────────────────────────────────────────────
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

    // ── Modal 2: Miglioramento (opzionale) ──────────────────────────────────
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

    // Rimuovi il menu
    await modalSubmit1.editReply({ components: [] }).catch(() => {});

    // ── Aspetta submit Modal 2 ──────────────────────────────────────────────
    let modalSubmit2;
    try {
      modalSubmit2 = await selectInteraction.awaitModalSubmit({
        time: 300000,
        filter: m => m.customId === `miglioramento_modal_${interaction.user.id}` && m.user.id === interaction.user.id
      });
    } catch {
      await modalSubmit1.editReply({
        embeds: [new EmbedBuilder().setColor(0xFF4444).setTitle('⏰ Tempo Scaduto').setDescription('Riusa `/resoconto` per ricominciare.')],
        components: []
      }).catch(() => {});
      return;
    }

    const miglioramento = modalSubmit2.fields.getTextInputValue('miglioramento').trim();

    // Defer subito per evitare Unknown Interaction (timeout 3s Discord)
    await modalSubmit2.deferReply({ ephemeral: true });

    // ── Costruisci embed finale ─────────────────────────────────────────────
    const valutazioneMap = {
      'SCARSA':      '🔴 SCARSA',
      'SUFFICIENTE': '🟡 SUFFICIENTE',
      'BUONA':       '🟢 BUONA',
      'OTTIMA':      '🌟 OTTIMA'
    };
    const coloriMap = {
      'SCARSA':      0xFF4444,
      'SUFFICIENTE': 0xFFAA00,
      'BUONA':       0x00CC44,
      'OTTIMA':      0x00D4FF
    };

    const now = new Date();
    const dataItaliana = now.toLocaleDateString('it-IT', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'Europe/Rome'
    });
    const oraItaliana = now.toLocaleTimeString('it-IT', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'
    });

    const resocontoEmbed = new EmbedBuilder()
      .setColor(coloriMap[valutazione] ?? 0x00D4FF)
      .setTitle(`📊 Resoconto Settimanale — ${serverData.nome}`)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🏠 Server',                 value: `**${serverData.nome}**`,                            inline: true  },
        { name: '👑 Owner',                  value: `<@${interaction.user.id}>`,                         inline: true  },
        { name: '📅 Data Compilazione',      value: `${dataItaliana} alle **${oraItaliana}**`,           inline: false },
        { name: '🤝 Partnership Effettuate', value: `**${partnership}** questa settimana`,               inline: true  },
        { name: '📈 Valutazione Attività',   value: `**${valutazioneMap[valutazione] ?? valutazione}**`, inline: true  }
      )
      .setFooter({ text: 'SkyForce Ultimate Chain • Resoconto Settimanale' })
      .setTimestamp();

    if (miglioramento.length > 0) {
      resocontoEmbed.addFields({
        name: '💡 Piano di Miglioramento',
        value: miglioramento.slice(0, 1024),  // FIX: tronca a 1024 char (limite embed field)
        inline: false
      });
    }

    // ── Invia nel canale resoconti ──────────────────────────────────────────
    const canaleResoconto = await interaction.guild.channels
      .fetch(db.resocontoChannel)
      .catch(() => null);

    if (canaleResoconto) {
      await canaleResoconto.send({ embeds: [resocontoEmbed] });
    }

    // ── Conferma all'utente ─────────────────────────────────────────────────
    await modalSubmit2.editReply({
      embeds: [new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('✅ Resoconto Inviato!')
        .setDescription(
          `Il tuo resoconto per **${serverData.nome}** è stato inviato!\n\n` +
          `🤝 Partnership: **${partnership}**\n` +
          `📊 Valutazione: **${valutazioneMap[valutazione] ?? valutazione}**\n\n` +
          `Grazie per aver compilato il resoconto settimanale! 💪`
        )
        .setFooter({ text: 'SkyForce Ultimate Chain' })
        .setTimestamp()
      ]
    });
  }
};
