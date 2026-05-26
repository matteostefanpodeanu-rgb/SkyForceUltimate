const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} = require('discord.js');
const { readDB } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('🧪 Comandi di test per verificare il funzionamento del bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('tipo')
        .setDescription('Cosa vuoi testare?')
        .setRequired(true)
        .addChoices(
          { name: '📊 Stato Bot — configurazione attuale del db',         value: 'stato'         },
          { name: '📋 Reminder — invia subito il reminder domenicale',    value: 'reminder'      },
          { name: '⚠️ Ultimo Avviso — invia subito l\'ultimo avviso',     value: 'ultimo_avviso' },
          { name: '🔔 Bottone Reminder — simula click sul bottone',       value: 'bottone'       },
        )),

  async execute(interaction) {
    const tipo = interaction.options.getString('tipo');
    const db = readDB();

    // ── Stato ────────────────────────────────────────────────────────────────
    if (tipo === 'stato') {
      const servers = Object.entries(db.servers);

      const serverList = servers.length > 0
        ? servers.map(([key, s]) => {
            const owners = Array.isArray(s.ownerIds)
              ? s.ownerIds.map(id => `<@${id}>`).join(', ')
              : `<@${s.ownerId}>`;
            const ruolo = s.roleId ? `<@&${s.roleId}>` : '❌ nessun ruolo';
            return `**${s.nome}**\n🏷️ Ruolo: ${ruolo}\n👑 Owners: ${owners}\n🆔 \`${s.discordId}\``;
          }).join('\n\n')
        : '❌ Nessun server registrato';

      const embed = new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle('🧪 Stato Configurazione Bot')
        .addFields(
          { name: '📬 Canale Resoconti', value: db.resocontoChannel ? `<#${db.resocontoChannel}>` : '❌ Non configurato', inline: true },
          { name: '🔔 Canale Reminder',  value: db.reminderChannel  ? `<#${db.reminderChannel}>` : '❌ Non configurato',  inline: true },
          { name: `🌐 Server (${servers.length})`, value: serverList, inline: false },
        )
        .setFooter({ text: 'SkyForce Ultimate • Test' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── Reminder ─────────────────────────────────────────────────────────────
    if (tipo === 'reminder' || tipo === 'ultimo_avviso') {
      if (!db.reminderChannel) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(0xFF4444)
            .setTitle('❌ Canale Reminder non configurato')
            .setDescription('Usa `/setup-canale tipo:Canale Reminder` prima di testare.')
          ],
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const client = interaction.client;

      const parts = [];
      for (const [, s] of Object.entries(db.servers)) {
        if (s.roleId) parts.push(`<@&${s.roleId}>`);
        else {
          const ids = Array.isArray(s.ownerIds) ? s.ownerIds : [s.ownerId];
          ids.forEach(id => parts.push(`<@${id}>`));
        }
      }
      const pingString = parts.join(' ');

      const channel = await client.channels.fetch(db.reminderChannel).catch(() => null);
      if (!channel) {
        return interaction.editReply({ content: '❌ Canale reminder non trovato.' });
      }

      if (tipo === 'reminder') {
        const embed = new EmbedBuilder()
          .setColor(0x00D4FF)
          .setTitle('📋 Reminder Resoconto Settimanale')
          .setDescription(
            `**Buona domenica, SkyForce Ultimate!** 🚀\n\n` +
            `È ora di compilare il **resoconto settimanale**!\n\n` +
            `Ogni owner deve compilare il proprio resoconto entro:\n` +
            `> ⏰ **Oggi, domenica, ore 18:00** (ora italiana)\n\n` +
            `Usa il comando:\n> 📊 \`/resoconto\`\n\n` +
            `*Riporta le partnership effettuate, la valutazione dell'attività e i tuoi piani di miglioramento.*`
          )
          .setFooter({ text: 'SkyForce Ultimate Chain • Reminder Domenicale [TEST]' })
          .setTimestamp();

        await channel.send({
          content: pingString || undefined,
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('apri_resoconto_reminder')
              .setLabel('📊 Compila il Resoconto')
              .setStyle(ButtonStyle.Primary)
          )]
        });

      } else {
        const embed = new EmbedBuilder()
          .setColor(0xFF8800)
          .setTitle('⚠️ Ultimo Avviso — 1 ora alla scadenza!')
          .setDescription(
            `Manca **solo 1 ora** alla scadenza del resoconto settimanale!\n\n` +
            `> ⏰ Scadenza: **ore 18:00** (ora italiana)\n\n` +
            `Se non hai ancora compilato il tuo resoconto, fallo subito con \`/resoconto\`!\n\n` +
            `⚡ **Non perdere la scadenza!**`
          )
          .setFooter({ text: 'SkyForce Ultimate Chain • Ultimo Avviso [TEST]' })
          .setTimestamp();

        await channel.send({
          content: pingString || undefined,
          embeds: [embed],
          components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('apri_resoconto_reminder')
              .setLabel('📊 Compila Ora!')
              .setStyle(ButtonStyle.Danger)
          )]
        });
      }

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0x00FF88)
          .setTitle('✅ Test Inviato')
          .setDescription(`Il messaggio di test è stato inviato in <#${db.reminderChannel}>.`)
        ]
      });
    }

    // ── Bottone reminder ─────────────────────────────────────────────────────
    if (tipo === 'bottone') {
      return interaction.reply({
        content: '📊 Usa il comando `/resoconto` per compilare il tuo resoconto settimanale!',
        ephemeral: true
      });
    }
  }
};
