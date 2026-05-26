const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { readDB, writeDB } = require('../utils/database');
const { aggiornaUPPanel } = require('../utils/upPanel');

const REP_ROLE_ID       = '1505984896743637133';
const VICE_REP_ROLE_ID  = '1505986264984191056';
const MEDAGLIE          = ['🥇', '🥈', '🥉'];

function nextSunday() {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  return next.toLocaleDateString('it-IT', {
    weekday: 'long', day: '2-digit', month: 'long',
    timeZone: 'Europe/Rome'
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('valutazione')
    .setDescription('📊 Pubblica le valutazioni settimanali di tutti i server della chain'),

  async execute(interaction) {
    const member  = interaction.member;
    const hasRole = member.roles.cache.has(REP_ROLE_ID) || member.roles.cache.has(VICE_REP_ROLE_ID);

    if (!hasRole) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF4444)
          .setTitle('❌ Non Autorizzato')
          .setDescription('Solo **Rep** e **Vice Rep** possono pubblicare le valutazioni settimanali.')
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    const db      = readDB();
    const servers = Object.values(db.servers);

    if (servers.length === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF8800)
          .setTitle('⚠️ Nessun Server Registrato')
          .setDescription('Non ci sono server nella chain. Aggiungine con `/aggiungi-server`.')
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    const targetChannel = db.valutazioniChannel || db.resocontoChannel;
    if (!targetChannel) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF8800)
          .setTitle('⚠️ Canale Non Configurato')
          .setDescription('Configura il canale valutazioni con `/setup-canale` → **Canale Valutazioni**.')
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    // ── Messaggio iniziale ───────────────────────────────────────────────────
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 Valutazioni Settimanali — SkyForce Ultimate')
        .setDescription(
          `Ciao **${interaction.user.username}**! 👋\n\n` +
          `Stai per compilare le valutazioni per **${servers.length} server** della chain.\n\n` +
          `Per ogni server ti verrà chiesto:\n` +
          `• 🤝 Partnership effettuate\n` +
          `• 📈 UP guadagnati\n` +
          `• ⚠️ Penalità (se presenti)\n\n` +
          `Clicca **Inizia** quando sei pronto.`
        )
        .setFooter({ text: `SkyForce Ultimate Chain • ${servers.length} server da valutare` })
        .setTimestamp()
      ],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`val_start_${interaction.user.id}`)
          .setLabel('📝 Inizia Valutazioni')
          .setStyle(ButtonStyle.Primary)
      )],
      ephemeral: true
    });

    let btnInteraction;
    try {
      btnInteraction = await interaction.channel.awaitMessageComponent({
        filter: i => i.customId === `val_start_${interaction.user.id}` && i.user.id === interaction.user.id,
        time: 120_000
      });
    } catch {
      await interaction.editReply({ components: [] }).catch(() => {});
      return;
    }
    await interaction.editReply({ components: [] }).catch(() => {});

    // ── Loop modal per ogni server ───────────────────────────────────────────
    const risultati        = [];
    let currentInteraction = btnInteraction;

    for (let i = 0; i < servers.length; i++) {
      const srv    = servers[i];
      const isLast = i === servers.length - 1;

      const modal = new ModalBuilder()
        .setCustomId(`val_modal_${interaction.user.id}_${i}`)
        .setTitle(`${srv.nome} (${i + 1}/${servers.length})`);

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('partnership')
            .setLabel('Partnership effettuate questa settimana')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Es: 42')
            .setMinLength(1).setMaxLength(5)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('up_guadagnati')
            .setLabel('UP guadagnati (numero intero)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Es: 10')
            .setMinLength(1).setMaxLength(5)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('penalita')
            .setLabel('Penalità (scrivi Nessuna se assenti)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Es: Nessuna  oppure  Inattività -5 UP')
            .setMaxLength(100)
            .setRequired(true)
        )
      );

      await currentInteraction.showModal(modal);

      let modalSubmit;
      try {
        modalSubmit = await currentInteraction.awaitModalSubmit({
          filter: m => m.customId === `val_modal_${interaction.user.id}_${i}` && m.user.id === interaction.user.id,
          time: 300_000
        });
      } catch {
        await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF4444)
            .setTitle('⏰ Tempo Scaduto')
            .setDescription('Hai impiegato troppo tempo. Riusa `/valutazione` per ricominciare.')
          ],
          components: []
        }).catch(() => {});
        return;
      }

      const partnership  = parseInt(modalSubmit.fields.getTextInputValue('partnership').trim())  || 0;
      const upGuadagnati = parseInt(modalSubmit.fields.getTextInputValue('up_guadagnati').trim()) || 0;
      const penalita     = modalSubmit.fields.getTextInputValue('penalita').trim();
      risultati.push({ srv, partnership, upGuadagnati, penalita });

      if (!isLast) {
        await modalSubmit.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`✅ ${srv.nome} salvato!`)
            .setDescription(
              `**${i + 1}/${servers.length}** completati.\n\n` +
              `Prossimo: **${servers[i + 1].nome}**\n` +
              `Clicca **Continua** per procedere.`
            )
            .setFooter({ text: 'SkyForce Ultimate Chain • Valutazioni in corso...' })
          ],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`val_next_${interaction.user.id}_${i}`)
              .setLabel(`➡️ Continua (${i + 2}/${servers.length})`)
              .setStyle(ButtonStyle.Primary)
          )],
          ephemeral: true
        });

        try {
          currentInteraction = await interaction.channel.awaitMessageComponent({
            filter: c => c.customId === `val_next_${interaction.user.id}_${i}` && c.user.id === interaction.user.id,
            time: 120_000
          });
          await modalSubmit.editReply({ components: [] }).catch(() => {});
        } catch {
          await modalSubmit.editReply({ components: [] }).catch(() => {});
          await interaction.followUp({
            embeds: [new EmbedBuilder()
              .setColor(0xFF4444).setTitle('⏰ Tempo Scaduto')
              .setDescription('Sessione scaduta. Riusa `/valutazione` per ricominciare.')
            ],
            ephemeral: true
          }).catch(() => {});
          return;
        }
      } else {
        await modalSubmit.reply({
          embeds: [new EmbedBuilder()
            .setColor(0x00FF88).setTitle('✅ Tutti i dati raccolti!')
            .setDescription('Sto pubblicando le valutazioni nel canale...')
            .setFooter({ text: 'SkyForce Ultimate Chain' })
          ],
          ephemeral: true
        });
      }
    }

    // ── Ordina per partnership ────────────────────────────────────────────────
    risultati.sort((a, b) => b.partnership - a.partnership);

    // ── Aggiorna UP nel db ───────────────────────────────────────────────────
    const dbFresh = readDB();
    if (!dbFresh.up) dbFresh.up = { messageId: null, channelId: null, scores: {} };
    for (const { srv, upGuadagnati } of risultati) {
      if (!(srv.nome in dbFresh.up.scores)) dbFresh.up.scores[srv.nome] = 0;
      dbFresh.up.scores[srv.nome] += upGuadagnati;
    }
    writeDB(dbFresh);
    await aggiornaUPPanel(interaction.client);

    // ── Costruisce embed stile B ─────────────────────────────────────────────
    const now = new Date();
    const dataSettimana = now.toLocaleDateString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Rome'
    });

    const totPartnership = risultati.reduce((acc, r) => acc + r.partnership, 0);
    const totUP          = risultati.reduce((acc, r) => acc + r.upGuadagnati, 0);
    const prossimaDom    = nextSunday();

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 Valutazioni Settimanali')
      .setDescription(`**SkyForce Ultimate Chain** • Settimana del ${dataSettimana}\nCompilatouda <@${interaction.user.id}>`)
      // Metriche header (4 card inline)
      .addFields(
        { name: '🏠 Server valutati',     value: `**${risultati.length}**`,    inline: true },
        { name: '🤝 Totale partnership',   value: `**${totPartnership}**`,      inline: true },
        { name: '📈 UP assegnati',         value: `**+${totUP}**`,              inline: true },
        { name: '📅 Prossima valutazione', value: `**${prossimaDom}**`,         inline: true }
      );

    // Separatore visivo
    embed.addFields({ name: '\u200b', value: '─────────────────────', inline: false });

    // Riga per ogni server
    for (let i = 0; i < risultati.length; i++) {
      const { srv, partnership, upGuadagnati, penalita } = risultati[i];
      const medaglia   = i < 3 ? MEDAGLIE[i] : `**${i + 1}.**`;
      const penalitaFmt = (!penalita || penalita.toLowerCase() === 'nessuna')
        ? '✅ Nessuna'
        : `⚠️ ${penalita}`;
      const upTotali = dbFresh.up.scores[srv.nome] ?? 0;

      embed.addFields({
        name: `${medaglia} ${srv.nome}`,
        value:
          `🤝 **${partnership}** partnership  •  📈 **+${upGuadagnati} UP**  •  🏆 Totale: **${upTotali} UP**\n` +
          `${penalitaFmt}`,
        inline: false
      });
    }

    embed
      .setFooter({ text: `SkyForce Ultimate Chain • Valutazioni Settimanali` })
      .setTimestamp();

    // ── Invia nel canale valutazioni ─────────────────────────────────────────
    const canale = await interaction.guild.channels.fetch(targetChannel).catch(() => null);
    if (canale) await canale.send({ embeds: [embed] });

    await interaction.followUp({
      embeds: [new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('🚀 Valutazioni Pubblicate!')
        .setDescription(
          `Le valutazioni di **${risultati.length} server** sono state pubblicate in <#${targetChannel}>.\n` +
          `Il pannello UP è stato aggiornato automaticamente.`
        )
        .setFooter({ text: 'SkyForce Ultimate Chain' })
        .setTimestamp()
      ],
      ephemeral: true
    }).catch(() => {});
  }
};
