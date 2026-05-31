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
const { aggiornaUPPanel, C_VIOLA, C_RED, C_GREEN, SEP, SEP_THIN } = require('../utils/upPanel');

const REP_ROLE_ID      = '1505984896743637133';
const VICE_REP_ROLE_ID = '1505986264984191056';
const MEDAGLIE         = ['🥇', '🥈', '🥉'];

function calcolaUP(partnership) {
  const p = parseInt(partnership) || 0;
  if (p >= 150) return +25;
  if (p >= 125) return +21;
  if (p >= 100) return +18;
  if (p >= 75)  return +15;
  if (p >= 60)  return +13;
  if (p >= 50)  return +11;
  if (p >= 40)  return +9;
  if (p >= 35)  return +8;
  if (p >= 25)  return -4;
  if (p >= 10)  return -5;
  return -6;
}

function getUPLine(up) {
  if (up > 0) return `📈  **+${up} UP**  ✅`;
  if (up < 0) return `📉  **${up} UP**  ❌`;
  return `➖  **0 UP**`;
}

function getPenalitaLine(penalita) {
  if (!penalita || penalita.trim() === '' || penalita.trim().toLowerCase() === 'nessuna')
    return `🟢  Nessuna`;
  return `🔴  ${penalita.trim()}`;
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
          .setColor(C_RED)
          .setTitle('❌  Non Autorizzato')
          .setDescription(`${SEP}\n\nSolo **Rep** e **Vice Rep** possono pubblicare le valutazioni.\n\n${SEP}`)
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    const db      = readDB();
    const servers = Object.values(db.servers);
    const minimo  = db.minimoPartnership ?? 35;

    if (servers.length === 0) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xE67E22)
          .setTitle('⚠️  Nessun Server Registrato')
          .setDescription(`${SEP}\n\nNon ci sono server nella chain.\nAggiungine con \`/aggiungi-server\`.\n\n${SEP}`)
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    const canalePubblicazione = db.valutazioneChannel || db.resocontoChannel;
    if (!canalePubblicazione) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xE67E22)
          .setTitle('⚠️  Canale Non Configurato')
          .setDescription(`${SEP}\n\nConfigura il canale con \`/setup-canale\`.\n\n${SEP}`)
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    // ── Messaggio iniziale ───────────────────────────────────────────────────
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(C_VIOLA)
        .setTitle('📊  Valutazioni Settimanali')
        .setDescription(
          `${SEP}\n\n` +
          `👋  Ciao **${interaction.user.username}**!\n\n` +
          `Stai per compilare le valutazioni per **${servers.length} server**.\n\n` +
          `${SEP_THIN}\n\n` +
          `> 🤝  Partnership effettuate per ogni server\n` +
          `> 🔮  Gli UP vengono calcolati automaticamente\n` +
          `> 📌  Minimo settimanale: **${minimo} partnership**\n\n` +
          `${SEP}`
        )
        .setFooter({ text: `SkyForce Ultimate Chain  •  ${servers.length} server da valutare` })
        .setTimestamp()
      ],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`val_start_${interaction.user.id}`)
          .setLabel('📝  Inizia Valutazioni')
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

    const risultati        = [];
    let currentInteraction = btnInteraction;

    for (let i = 0; i < servers.length; i++) {
      const srv    = servers[i];
      const isLast = i === servers.length - 1;

      const modal = new ModalBuilder()
        .setCustomId(`val_modal_${interaction.user.id}_${i}`)
        .setTitle(`${srv.nome.slice(0, 30)} (${i + 1}/${servers.length})`);

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('partnership')
            .setLabel('Partnership effettuate')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`Es: 42  (minimo: ${minimo})`)
            .setMinLength(1)
            .setMaxLength(5)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('penalita')
            .setLabel('Penalità extra (lascia vuoto se ok)')  // 36 char ✅
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Es: Inattività -5 UP')
            .setMaxLength(100)
            .setRequired(false)
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
          embeds: [new EmbedBuilder().setColor(C_RED).setTitle('⏰  Tempo Scaduto').setDescription('Riusa `/valutazione` per ricominciare.')],
          components: []
        }).catch(() => {});
        return;
      }

      const partnership = parseInt(modalSubmit.fields.getTextInputValue('partnership').trim()) || 0;
      const penalita    = modalSubmit.fields.getTextInputValue('penalita').trim();
      const upCalcolati = calcolaUP(partnership);
      const colPreview  = upCalcolati >= 0 ? C_GREEN : C_RED;
      const soglia      = partnership >= minimo ? '✅' : '⚠️';

      risultati.push({ srv, partnership, upCalcolati, penalita });

      const previewDesc =
        `${SEP_THIN}\n\n` +
        `🏠  **${srv.nome}**\n` +
        `🤝  Partnership: **${partnership}** ${soglia}\n` +
        `${getUPLine(upCalcolati)}\n` +
        `⚠️  Penalità extra: ${getPenalitaLine(penalita)}\n\n` +
        `${SEP_THIN}`;

      if (!isLast) {
        await modalSubmit.reply({
          embeds: [new EmbedBuilder()
            .setColor(colPreview)
            .setTitle(`✅  ${srv.nome.slice(0, 35)} — Salvato`)
            .setDescription(
              `${SEP}\n\n` +
              previewDesc + `\n\n` +
              `**${i + 1} / ${servers.length}** completati\n` +
              `▸  Prossimo: **${servers[i + 1].nome}**\n\n` +
              `${SEP}`
            )
            .setFooter({ text: 'SkyForce Ultimate Chain  •  Valutazioni in corso...' })
          ],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`val_next_${interaction.user.id}_${i}`)
              .setLabel(`➡️  Continua (${i + 2} / ${servers.length})`)
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
            embeds: [new EmbedBuilder().setColor(C_RED).setTitle('⏰  Sessione Scaduta').setDescription('Riusa `/valutazione` per ricominciare.')],
            ephemeral: true
          }).catch(() => {});
          return;
        }
      } else {
        await modalSubmit.reply({
          embeds: [new EmbedBuilder()
            .setColor(colPreview)
            .setTitle(`✅  ${srv.nome.slice(0, 35)} — Salvato`)
            .setDescription(
              `${SEP}\n\n` +
              previewDesc + `\n\n` +
              `Tutti i server completati!\n` +
              `Sto pubblicando le valutazioni...\n\n` +
              `${SEP}`
            )
            .setFooter({ text: 'SkyForce Ultimate Chain' })
          ],
          ephemeral: true
        });
      }
    }

    // ── Ordina e aggiorna UP ─────────────────────────────────────────────────
    risultati.sort((a, b) => b.partnership - a.partnership);

    const dbFresh = readDB();
    if (!dbFresh.up) dbFresh.up = { messageId: null, channelId: null, scores: {} };

    for (const { srv, upCalcolati } of risultati) {
      if (!(srv.nome in dbFresh.up.scores)) dbFresh.up.scores[srv.nome] = 0;
      dbFresh.up.scores[srv.nome] += upCalcolati;
      if (dbFresh.up.scores[srv.nome] < 0) dbFresh.up.scores[srv.nome] = 0;
    }
    writeDB(dbFresh);
    await aggiornaUPPanel(interaction.client);

    // ── Embed valutazioni ────────────────────────────────────────────────────
    const now = new Date();
    const settimana = now.toLocaleDateString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric',
      timeZone: 'Europe/Rome'
    });
    const totPartnership = risultati.reduce((acc, r) => acc + r.partnership, 0);

    const embed = new EmbedBuilder()
      .setColor(C_VIOLA)
      .setTitle('📊  VALUTAZIONI SETTIMANALI — SKYFORCE ULTIMATE')
      .setDescription(
        `${SEP}\n\n` +
        `📅  Settimana del **${settimana}**\n` +
        `✍️  Compilata da <@${interaction.user.id}>\n\n` +
        `${SEP}`
      )
      .setTimestamp();

    for (let i = 0; i < risultati.length; i++) {
      const { srv, partnership, upCalcolati, penalita } = risultati[i];
      const medaglia = i < 3 ? MEDAGLIE[i] : `\`${i + 1}.\``;
      const upTotali = dbFresh.up.scores[srv.nome] ?? 0;
      const upLabel  = upCalcolati >= 0 ? `+${upCalcolati}` : `${upCalcolati}`;
      const upEmoji  = upCalcolati >= 0 ? '📈' : '📉';
      const soglia   = partnership >= minimo ? '✅' : '⚠️';

      embed.addFields({
        name: `${medaglia}  ${srv.nome}`,
        value:
          `🤝  Partnership: **${partnership}** ${soglia}\n` +
          `${upEmoji}  UP Settimana: **${upLabel}**\n` +
          `🏆  UP Totali: **${upTotali}**\n` +
          `⚠️  Penalità extra: ${getPenalitaLine(penalita)}\n` +
          `\u200B`,
        inline: false
      });
    }

    embed.addFields(
      { name: SEP_THIN,                        value: '\u200B',                    inline: false },
      { name: '🤝  Partnership Totali',         value: `**${totPartnership}**`,     inline: true  },
      { name: '🏠  Server Valutati',            value: `**${risultati.length}**`,   inline: true  },
      { name: '📌  Minimo Settimanale',         value: `**${minimo}** partner`,     inline: true  }
    );

    embed.setFooter({ text: 'SkyForce Ultimate Chain  •  Valutazioni Settimanali' });

    const canale = await interaction.guild.channels.fetch(canalePubblicazione).catch(() => null);
    if (canale) await canale.send({ embeds: [embed] });

    await interaction.followUp({
      embeds: [new EmbedBuilder()
        .setColor(C_GREEN)
        .setTitle('🚀  Valutazioni Pubblicate!')
        .setDescription(
          `${SEP}\n\n` +
          `Le valutazioni di **${risultati.length} server** sono state pubblicate in <#${canalePubblicazione}>.\n` +
          `Il pannello UP è stato aggiornato automaticamente.\n\n` +
          `${SEP}`
        )
        .setFooter({ text: 'SkyForce Ultimate Chain' })
        .setTimestamp()
      ],
      ephemeral: true
    }).catch(() => {});
  }
};
