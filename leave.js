const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, Collection, Intents } = require('discord.js');
const configFile = (process.argv[2]) ? process.argv[2] : './config.json';
const { token, clientId, guildIds } = require(configFile); const config = require(configFile);

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });

client.once('ready', () => {
	console.log('Ready!');
	client.user.setActivity("by RedTech", {
		type: "PLAYING"
	});
});

const guilds = client.guilds.cache;
guilds.forEach((guild, i) => {
  if (config.guildIds.indexOf(guild.id) > -1) config.guildIds.splice(config.guildIds.indexOf(guild.id), 1);
  fs.writeFile(configFile, JSON.stringify(config), (err) => {
		if (err) console.log("[GuildDelete][WriteFile][Error]: ", err);
	});
  guild.leave();
});
