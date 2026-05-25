const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {

    // ── Bottone reminder: non rilanciare execute, solo avvisa l'utente ──────
    if (interaction.isButton() && interaction.customId === 'apri_resoconto_reminder') {
      await interaction.reply({
        content: '📊 Usa il comando `/resoconto` per compilare il tuo resoconto settimanale!',
        ephemeral: true
      });
      return;
    }

    // ── Ignora interazioni non-slash (select menu, modal, altri bottoni) ────
    // Vengono già gestiti dai collector dentro i singoli comandi
    if (!interaction.isChatInputCommand()) return;

    // ── Comandi slash ────────────────────────────────────────────────────────
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`Comando non trovato: ${interaction.commandName}`);
      return;
    }

    await logger.comando(
      `Comando /${interaction.commandName}`,
      null,
      [
        { name: '👤 Utente', value: `<@${interaction.user.id}> (\`${interaction.user.tag}\`)`, inline: true },
        { name: '📍 Canale', value: `<#${interaction.channelId}>`, inline: true },
      ]
    );

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Errore nel comando ${interaction.commandName}:`, error);

      await logger.errore(
        `Errore Comando /${interaction.commandName}`,
        `\`\`\`${error.message}\`\`\``,
        [
          { name: '👤 Utente', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📍 Canale', value: `<#${interaction.channelId}>`, inline: true },
          { name: '🔍 Stack', value: `\`\`\`${(error.stack || '').slice(0, 500)}\`\`\``, inline: false },
        ]
      );

      const errMsg = {
        content: '❌ Si è verificato un errore nell\'esecuzione del comando.',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errMsg);
      } else {
        await interaction.reply(errMsg);
      }
    }
  }
};
