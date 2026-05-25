const { Events } = require('discord.js');

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

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Errore nel comando ${interaction.commandName}:`, error);

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
