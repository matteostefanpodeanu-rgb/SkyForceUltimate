const { ActivityType } = require('discord.js');
const { startReminderScheduler } = require('../utils/scheduler');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Bot online come ${client.user.tag}`);

    client.user.setPresence({
      activities: [{
        name: 'SkyForce Ultimate Chain',
        type: ActivityType.Watching
      }],
      status: 'online'
    });

    startReminderScheduler(client);
  }
};
