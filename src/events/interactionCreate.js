const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {

    // Gestione bottone reminder → lancia il comando resoconto
    if (interaction.isButton() && interaction.customId === 'apri_resoconto_reminder') {
      const resocontoCommand = interaction.client.commands.get('resoconto');
      if (resocontoCommand) {
        try {
          await resocontoCommand.execute(interaction);
        } catch (err) {
          console.error('Errore nel comando resoconto da bottone:', err);
          await logger.errore('Errore Bottone Resoconto', err.message, [
            { name: '👤 Utente', value: `<@${interaction.user.id}>`, inline: true },
          ]);
        }
      }
      return;
    }

    // Gestione comandi slash
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`Comando non trovato: ${interaction.commandName}`);
      return;
    }

    // Log utilizzo comando
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
