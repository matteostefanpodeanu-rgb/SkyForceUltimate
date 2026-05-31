const { Events } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {

    // ── Bottone reminder ─────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId === 'apri_resoconto_reminder') {
      try {
        await interaction.reply({
          content: '📊 Usa il comando `/resoconto` per compilare il tuo resoconto settimanale!',
          ephemeral: true
        });
      } catch { /* interazione scaduta, ignora */ }
      return;
    }

    // ── Ignora tutto ciò che non è un comando slash ──────────────────────────
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`Comando non trovato: ${interaction.commandName}`);
      return;
    }

    // ── Log del comando (fire-and-forget, non blocca l'esecuzione) ───────────
    logger.comando(
      `Comando /${interaction.commandName}`,
      null,
      [
        { name: '👤 Utente', value: `<@${interaction.user.id}> (\`${interaction.user.tag}\`)`, inline: true },
        { name: '📍 Canale', value: `<#${interaction.channelId}>`, inline: true },
      ]
    ).catch(() => {});

    // ── Esecuzione comando ───────────────────────────────────────────────────
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Errore nel comando ${interaction.commandName}:`, error);

      // Log errore (fire-and-forget)
      logger.errore(
        `Errore Comando /${interaction.commandName}`,
        `\`\`\`${error.message}\`\`\``,
        [
          { name: '👤 Utente', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📍 Canale', value: `<#${interaction.channelId}>`, inline: true },
          { name: '🔍 Stack', value: `\`\`\`${(error.stack || '').slice(0, 500)}\`\`\``, inline: false },
        ]
      ).catch(() => {});

      // Risposta di errore all'utente — non crashare se l'interazione è scaduta
      try {
        const errMsg = {
          content: '❌ Si è verificato un errore nell\'esecuzione del comando.',
          ephemeral: true
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errMsg);
        } else {
          await interaction.reply(errMsg);
        }
      } catch { /* interazione scaduta, ignora */ }
    }
  }
};
