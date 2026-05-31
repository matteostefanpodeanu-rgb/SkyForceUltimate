const { ActivityType } = require('discord.js');
const { startReminderScheduler } = require('../utils/scheduler');
const logger = require('../utils/logger');
const { initDB, getDBPath } = require('../utils/database');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Bot online come ${client.user.tag}`);

    // Inizializza il DB (scarica da GitHub se configurato)
    await initDB();
    console.log(`💾 DB: ${getDBPath()}`);

    // Registra il client nel logger
    logger.setClient(client);

    client.user.setPresence({
      activities: [{
        name: 'SkyForce Ultimate Chain',
        type: ActivityType.Watching
      }],
      status: 'online'
    });

    startReminderScheduler(client);

    // Log di avvio nel canale Discord
    await logger.avvio(
      'Bot Online',
      `**SkyForce Ultimate** è ora operativo e connesso a Discord.`,
      [
        { name: '🤖 Tag',      value: `\`${client.user.tag}\``,                          inline: true  },
        { name: '🆔 ID',       value: `\`${client.user.id}\``,                           inline: true  },
        { name: '📡 Server',   value: `\`${client.guilds.cache.size}\` server connessi`,  inline: true  },
        { name: '⌨️ Comandi', value: `\`${client.commands.size}\` comandi caricati`,     inline: true  },
        { name: '🕐 Avvio',   value: `<t:${Math.floor(Date.now() / 1000)}:R>`,           inline: true  },
        { name: '💾 Database', value: `\`${getDBPath()}\``,                               inline: false },
      ]
    );
  }
};
