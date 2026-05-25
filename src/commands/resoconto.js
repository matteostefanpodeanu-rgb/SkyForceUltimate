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
  ComponentType
} = require('discord.js');
const { readDB } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resoconto')
    .setDescription('📊 Compila il resoconto settimanale del tuo server'),

  async execute(interaction) {
    const db = readDB();

    // Trova tutti i server associati a questo utente (può essere owner di più server)
    const serverEntries = Object.entries(db.servers).filter(
      ([, srv]) => Array.isArray(srv.ownerIds)
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

    // Usa il primo server trovato
    const [, serverData] = serverEntries[0];

    // ── Step 1: Seleziona valutazione attività ──────────────────────────────
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`attivita_${interaction.user.id}`)
      .setPlaceholder('Come valuti l\'attività del tuo server questa settimana?')
      .addOptions([
        new StringSelectMenuOptionBuilder()
          .setLabel('🔴 SCARSA')
          .setDescription('Poca attività, pochi progressi questa settimana')
          .setValue('SCARSA')
          .setEmoji('🔴'),
        new StringSelectMenuOptionBuilder()
          .setLabel('🟡 SUFFICIENTE')
          .setDescription('Attività nella media, margine di miglioramento')
          .setValue('SUFFICIENTE')
          .setEmoji('🟡'),
        new StringSelectMenuOptionBuilder()
          .setLabel('🟢 BUONA')
          .setDescription('Buona attività, obiettivi raggiunti')
          .setValue('BUONA')
          .setEmoji('🟢'),
        new StringSelectMenuOptionBuilder()
          .setLabel('🌟 OTTIMA')
          .setDescription('Settimana eccellente, grandi risultati!')
          .setValue('OTTIMA')
          .setEmoji('🌟'),
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const introEmbed = new EmbedBuilder()
      .setColor(0x00D4FF)
      .setTitle('📊 Resoconto Settimanale — SkyForce Ultimate')
      .setDescription(
        `Benvenuto **${interaction.user.username}**!\n\n` +
        `Stai compilando il resoconto per:\n` +
        `🏠 **${serverData.nome}**\n\n` +
        `**Step 1/2** — Seleziona la valutazione della tua attività settimanale.`
      )
      .setFooter({ text: 'SkyForce Ultimate Chain • Resoconto Settimanale' })
      .setTimestamp();

    const reply = await interaction.reply({
      embeds: [introEmbed],
      components: [row],
      ephemeral: true
    });

    // ── Collector per il menu di valutazione ───────────────────────────────
    const selectCollector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 120000
    });

    selectCollector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return;

      const valutazione = i.values[0];

      // ── Step 2: Modal con partnership (richiesto), valutazione già scelta,
      //           e miglioramento (opzionale) ──────────────────────────────
      const modal = new ModalBuilder()
        .setCustomId(`resoconto_modal_${interaction.user.id}`)
        .setTitle(`Resoconto — ${serverData.nome.slice(0, 40)}`);

      // Campo 1: Numero partnership (obbligatorio)
      const partnershipInput = new TextInputBuilder()
        .setCustomId('partnership')
        .setLabel('Quante partnership hai fatto questa settimana?')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Es: 3')
        .setMinLength(1)
        .setMaxLength(4)
        .setRequired(true);

      // Campo 2: Come reputi l'attività (obbligatorio — riepilogo della scelta)
      const attivitaInput = new TextInputBuilder()
        .setCustomId('attivita_recap')
        .setLabel('Come reputi l\'attività? (già selezionata)')
        .setStyle(TextInputStyle.Short)
        .setValue(valutazione)
        .setMinLength(1)
        .setMaxLength(20)
        .setRequired(true);

      // Campo 3: Cosa farai per migliorare (opzionale)
      const miglioramentoInput = new TextInputBuilder()
        .setCustomId('miglioramento')
        .setLabel('Cosa farai per migliorare? (opzionale)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Descrivi i tuoi piani per la prossima settimana... (opzionale)')
        .setMaxLength(1000)
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder().addComponents(partnershipInput),
        new ActionRowBuilder().addComponents(attivitaInput),
        new ActionRowBuilder().addComponents(miglioramentoInput)
      );

      await i.showModal(modal);

      // ── Aspetta la risposta del modal ──────────────────────────────────
      try {
        const modalSubmit = await i.awaitModalSubmit({
          time: 300000,
          filter: m => m.customId === `resoconto_modal_${interaction.user.id}`
        });

        const partnership    = modalSubmit.fields.getTextInputValue('partnership').trim();
        const attivitaRecap  = modalSubmit.fields.getTextInputValue('attivita_recap').trim().toUpperCase();
        const miglioramento  = modalSubmit.fields.getTextInputValue('miglioramento').trim();

        // Usa il valore del modal come valutazione definitiva (il menu potrebbe essere ignorato)
        const valutazioneFinale = ['SCARSA','SUFFICIENTE','BUONA','OTTIMA'].includes(attivitaRecap)
          ? attivitaRecap
          : valutazione;

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

        // Ottieni data italiana
        const now = new Date();
        const dataItaliana = now.toLocaleDateString('it-IT', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          timeZone: 'Europe/Rome'
        });
        const oraItaliana = now.toLocaleTimeString('it-IT', {
          hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome'
        });

        // ── Embed finale ──────────────────────────────────────────────────
        const resocontoEmbed = new EmbedBuilder()
          .setColor(coloriMap[valutazioneFinale] ?? 0x00D4FF)
          .setTitle(`📊 Resoconto Settimanale — ${serverData.nome}`)
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: '🏠 Server',               value: `**${serverData.nome}**`,                        inline: true },
            { name: '👑 Owner',                value: `<@${interaction.user.id}>`,                     inline: true },
            { name: '📅 Data Compilazione',    value: `${dataItaliana} alle **${oraItaliana}**`,       inline: false },
            { name: '🤝 Partnership Effettuate', value: `**${partnership}** questa settimana`,          inline: true },
            { name: '📈 Valutazione Attività', value: `**${valutazioneMap[valutazioneFinale] ?? valutazioneFinale}**`, inline: true }
          )
          .setFooter({ text: 'SkyForce Ultimate Chain • Resoconto Settimanale' })
          .setTimestamp();

        // Campo miglioramento solo se compilato
        if (miglioramento.length > 0) {
          resocontoEmbed.addFields({
            name: '💡 Piano di Miglioramento',
            value: miglioramento,
            inline: false
          });
        }

        // Invia nel canale resoconti
        const canaleResoconto = await interaction.guild.channels
          .fetch(db.resocontoChannel)
          .catch(() => null);

        if (canaleResoconto) {
          await canaleResoconto.send({ embeds: [resocontoEmbed] });
        }

        // Conferma all'utente
        const confermaEmbed = new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('✅ Resoconto Inviato!')
          .setDescription(
            `Il tuo resoconto per **${serverData.nome}** è stato inviato con successo!\n\n` +
            `📊 Valutazione: **${valutazioneMap[valutazioneFinale] ?? valutazioneFinale}**\n` +
            `🤝 Partnership: **${partnership}**\n\n` +
            `Grazie per aver compilato il resoconto settimanale! 💪`
          )
          .setFooter({ text: 'SkyForce Ultimate Chain' })
          .setTimestamp();

        await modalSubmit.reply({ embeds: [confermaEmbed], ephemeral: true });
        selectCollector.stop();

      } catch (err) {
        if (err.code === 'InteractionCollectorError') {
          await interaction.editReply({
            embeds: [new EmbedBuilder()
              .setColor(0xFF4444)
              .setTitle('⏰ Tempo Scaduto')
              .setDescription('Il resoconto è scaduto. Riusa `/resoconto` per ricominciare.')
            ],
            components: []
          }).catch(() => {});
        }
      }
    });

    selectCollector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  }
};
