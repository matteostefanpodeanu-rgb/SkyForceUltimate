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

const REP_ROLE_ID      = '1505984896743637133';
const VICE_REP_ROLE_ID = '1505986264984191056';
const MEDAGLIE         = ['🥇', '🥈', '🥉'];
const SEP              = '━━━━━━━━━━━━━━━━━━━━━━━━━━';

// ── Tabella punti partnership ────────────────────────────────────────────────
// Restituisce UP da aggiungere (positivi) o penalità (negativi)
// Minimo settimanale: 35 partnership
function calcolaUP(partnership) {
  const p = parseInt(partnership) || 0;
  if (p >= 150) return +25;
  if (p >= 125) return +21;
  if (p >= 100) return +18;
  if (p >= 75)  return +15;
  if (p >= 60)  return +13;
  if (p >= 50)  return +11;
  if (p >= 40)  return +9;
  if (p >= 35)  return +8;   // minimo settimanale
  if (p >= 25)  return -4;   // penalità lieve
  if (p >= 10)  return -5;   // penalità media
  return -6;                 // penalità grave (0–9)
}

function getUPLabel(up) {
  if (up > 0) return `✅  **+${up} UP** (guadagnati)`;
  if (up < 0) return `❌  **${up} UP** (penalità)`;
  return `➖  **0 UP**`;
}

function getMedagliaPenalita(penalita) {
  if (!penalita || penalita.trim() === '' || penalita.trim().toLowerCase() === 'nessuna') return '✅  Nessuna';
  return `⚠️  ${penalita.trim()}`;
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
    const minimo  = db.minimoPartnership ?? 35;

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

    const canalePubblicazione = db.valutazioneChannel || db.resocontoChannel;
    if (!canalePubblicazione) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xFF8800)
          .setTitle('⚠️ Canale Non Configurato')
          .setDescription('Configura il canale valutazioni con `/setup-canale` prima di procedere.')
          .setFooter({ text: 'SkyForce Ultimate Chain' })
        ],
        ephemeral: true
      });
    }

    // ── Messaggio iniziale ───────────────────────────────────────────────────
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle('📊 Valutazioni Settimanali — SkyForce Ultimate')
        .setDescription(
          `Ciao **${interaction.user.username}**! 👋\n\n` +
          `${SEP}\n\n` +
          `Stai per compilare le valutazioni per **${servers.length} server** della chain.\n\n` +
          `Per ogni server ti verrà chiesto:\n` +
          `> 🤝  Partnership effettuate\n` +
          `> ⚠️  Penalità aggiuntive (se presenti)\n\n` +
          `📌  Minimo settimanale: **${minimo} partnership**\n` +
          `📊  Gli UP vengono calcolati automaticamente.\n\n` +
          `${SEP}`
        )
        .setFooter({ text: `SkyForce Ultimate Chain  •  ${servers.length} server da valutare` })
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

    // ── Aspetta click bottone ────────────────────────────────────────────────
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

    // ── Loop su ogni server ──────────────────────────────────────────────────
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
            .setLabel('Partnership effettuate')       // 24 char ✅
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`Es: 42  (minimo: ${minimo})`)
            .setMinLength(1)
            .setMaxLength(5)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('penalita')
            .setLabel('Penalità extra (Nessuna se ok)')  // 32 char ✅
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

      const partnership  = parseInt(modalSubmit.fields.getTextInputValue('partnership').trim()) || 0;
      const penalita     = modalSubmit.fields.getTextInputValue('penalita').trim();

      // ── Calcolo automatico UP ────────────────────────────────────────────
      const upCalcolati = calcolaUP(partnership);

      risultati.push({ srv, partnership, upCalcolati, penalita });

      // ── Preview calcolo UP per il compilatore ────────────────────────────
      const previewColor = upCalcolati >= 0 ? 0x00CC44 : 0xFF4444;
      const previewDesc  =
        `🏠  **${srv.nome}**\n` +
        `🤝  Partnership: **${partnership}** / ${minimo} minimo\n` +
        `${getUPLabel(upCalcolati)}\n` +
        `⚠️  Penalità extra: ${getMedagliaPenalita(penalita)}\n\n`;

      if (!isLast) {
        await modalSubmit.reply({
          embeds: [new EmbedBuilder()
            .setColor(previewColor)
            .setTitle(`✅ ${srv.nome.slice(0, 40)} — Salvato`)
            .setDescription(
              `${previewDesc}` +
              `${SEP}\n\n` +
              `**${i + 1} / ${servers.length}** completati\n\n` +
              `> Prossimo server:\n` +
              `> 🏠  **${servers[i + 1].nome}**\n\n` +
              `${SEP}`
            )
            .setFooter({ text: 'SkyForce Ultimate Chain  •  Valutazioni in corso...' })
          ],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`val_next_${interaction.user.id}_${i}`)
              .setLabel(`➡️ Continua (${i + 2} / ${servers.length})`)
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
              .setColor(0xFF4444)
              .setTitle('⏰ Sessione Scaduta')
              .setDescription('Riusa `/valutazione` per ricominciare.')
            ],
            ephemeral: true
          }).catch(() => {});
          return;
        }
      } else {
        await modalSubmit.reply({
          embeds: [new EmbedBuilder()
            .setColor(previewColor)
            .setTitle(`✅ ${srv.nome.slice(0, 40)} — Salvato`)
            .setDescription(
              `${previewDesc}` +
              `${SEP}\n\n` +
              `Sto pubblicando le valutazioni nel canale...`
            )
            .setFooter({ text: 'SkyForce Ultimate Chain' })
          ],
          ephemeral: true
        });
      }
    }

    // ── Ordina per partnership (classifica) ──────────────────────────────────
    risultati.sort((a, b) => b.partnership - a.partnership);

    // ── Aggiorna UP nel db ───────────────────────────────────────────────────
    const dbFresh = readDB();
    if (!dbFresh.up) dbFresh.up = { messageId: null, channelId: null, scores: {} };

    for (const { srv, upCalcolati } of risultati) {
      if (!(srv.nome in dbFresh.up.scores)) dbFresh.up.scores[srv.nome] = 0;
      dbFresh.up.scores[srv.nome] += upCalcolati;
      // Evita che gli UP vadano sotto 0
      if (dbFresh.up.scores[srv.nome] < 0) dbFresh.up.scores[srv.nome] = 0;
    }
    writeDB(dbFresh);
    await aggiornaUPPanel(interaction.client);

    // ── Costruisce embed valutazioni ─────────────────────────────────────────
    const now = new Date();
    const settimana = now.toLocaleDateString('it-IT', {
      day: '2-digit', month: 'long', year: 'numeric',
      timeZone: 'Europe/Rome'
    });
    const totPartnership = risultati.reduce((acc, r) => acc + r.partnership, 0);

    const embed = new EmbedBuilder()
      .setColor(0xF5A623)
      .setTitle('📊  VALUTAZIONI SETTIMANALI — SKYFORCE ULTIMATE')
      .setDescription(
        `Settimana del **${settimana}**\n` +
        `Compilata da <@${interaction.user.id}>\n\n` +
        `${SEP}`
      )
      .setTimestamp();

    for (let i = 0; i < risultati.length; i++) {
      const { srv, partnership, upCalcolati, penalita } = risultati[i];
      const medaglia  = i < 3 ? MEDAGLIE[i] : `**${i + 1}.**`;
      const upTotali  = dbFresh.up.scores[srv.nome] ?? 0;
      const upLabel   = upCalcolati >= 0 ? `+${upCalcolati}` : `${upCalcolati}`;
      const upEmoji   = upCalcolati >= 0 ? '📈' : '📉';
      const soglia    = partnership >= minimo ? '✅' : '⚠️';

      embed.addFields({
        name: `${medaglia}  ${srv.nome}`,
        value:
          `🤝  Partnership: **${partnership}** ${soglia}\n` +
          `${upEmoji}  UP Settimana: **${upLabel}**\n` +
          `🏆  UP Totali: **${upTotali}**\n` +
          `⚠️  Penalità extra: ${getMedagliaPenalita(penalita)}\n` +
          `\u200B`,
        inline: false
      });
    }

    embed.addFields(
      { name: `${SEP}`, value: '\u200B', inline: false },
      { name: '📊  Partnership Totali Chain', value: `**${totPartnership}**`, inline: true },
      { name: '🏠  Server Valutati',          value: `**${risultati.length}**`, inline: true },
      { name: '📌  Minimo Settimanale',        value: `**${minimo}** partnership`, inline: true }
    );

    embed.setFooter({ text: 'SkyForce Ultimate Chain  •  Valutazioni Settimanali' });

    const canale = await interaction.guild.channels.fetch(canalePubblicazione).catch(() => null);
    if (canale) await canale.send({ embeds: [embed] });

    await interaction.followUp({
      embeds: [new EmbedBuilder()
        .setColor(0x00FF88)
        .setTitle('🚀 Valutazioni Pubblicate!')
        .setDescription(
          `Le valutazioni di **${risultati.length} server** sono state pubblicate in <#${canalePubblicazione}>.\n` +
          `Il pannello UP è stato aggiornato automaticamente.`
        )
        .setFooter({ text: 'SkyForce Ultimate Chain' })
        .setTimestamp()
      ],
      ephemeral: true
    }).catch(() => {});
  }
};
