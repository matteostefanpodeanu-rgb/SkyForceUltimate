const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command) {
    commands.push(command.data.toJSON());
    console.log(`📦 Trovato comando: /${command.data.name}`);
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`\n🔄 Registrazione di ${commands.length} comandi slash...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log(`✅ ${data.length} comandi registrati con successo!`);
    console.log('\nComandi disponibili:');
    data.forEach(cmd => console.log(`  /${cmd.name} — ${cmd.description}`));

  } catch (error) {
    console.error('❌ Errore nella registrazione dei comandi:', error);
  }
})();
