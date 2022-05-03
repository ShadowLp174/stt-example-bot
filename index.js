const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, Collection, Intents } = require('discord.js');
const configFile = (process.argv[2]) ? process.argv[2] : './config.json';
const { token, clientId, guildIds } = require(configFile); const config = require(configFile);
const MusicPlayer = require("./discord-player.js");

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

var DATA = {
	queue: [],
	loop: false,
	loopSong: false,
	volume: 1,
	current: null, // {id: "", title: ""}
	guildId: null,
	speech: false,
	status: "Idle"
};

var players = new Map();

client.once('ready', () => {
	console.log('Ready!');
	client.user.setActivity("by RedTech", {
		type: "PLAYING"
	});
});

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);
	if (!command) return;

	try {

		await execute(interaction.commandName, interaction);
		//DATA = await command.execute(interaction, client, DATA);
	} catch (error) {
		console.error(error);
		return interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

function deployCommands(guilds) {
	const commands = [];
	const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

	for (const file of commandFiles) {
		const command = require(`./commands/${file}`);
		commands.push(command.data.toJSON());
	}

	const rest = new REST({ version: '9' }).setToken(token);
	(async () => {
		try {
			console.log('Started refreshing application (/) commands.');
			guilds.forEach(await (async (guild, i) => {
				await rest.put(
					Routes.applicationGuildCommands(clientId, guild),
					{ body: commands },
				);
			}));
			console.log('Successfully reloaded application (/) commands.');
		} catch(e) {
			console.log(e);
		}
	})();
}

client.on('guildCreate', (guild) => {
	if (config.guildIds.indexOf(guild.id) == -1) {
		config.guildIds.push(guild.id);
		fs.writeFile(configFile, JSON.stringify(config), (err) => {
			if (err) console.log("[GuildCreate][WriteFile][Error]: ", err);
		});
	}
	deployCommands([guild.id]);
});
client.on('guildDelete', (guild) => {
	const i = config.guildIds.indexOf(guild.id);
	if (i > -1) {
		config.guildIds.splice(i, 1);
	}
	fs.writeFile(configFile, JSON.stringify(config), (err) => {
		if (err) console.log("[GuildDelete][WriteFile][Error]: ", err);
	});
});

async function execute(name, interaction) {
	if (!players.has(interaction.guildId)) {
		const musicPlayer = new MusicPlayer(client, configFile, DATA);
		musicPlayer.on("log", text => console.log("[" + interaction.guildId + "][Music Player][Log] " + text));
		musicPlayer.on("error", error => console.error("[" + interaction.guildId + "][Music Player][Error] " + error));
		musicPlayer.on("state", state => console.log("[" + interaction.guildId + "][Music Player][State Update] " + state));
		players.set(interaction.guildId, musicPlayer);
	}
	try {
		const musicPlayer = players.get(interaction.guild.id);
		switch(name) {
			case "join":
				await interaction.deferReply();
				let s = musicPlayer.join(interaction);
				if (!s) {interaction.editReply({ content: "Please join a voice channel first", ephemeral: true }); return;}
				interaction.editReply({ content: "Joined." });
			break;
			case "leave":
        await interaction.deferReply();
				var left = musicPlayer.leave(interaction);
				if (left) {
			    return interaction.editReply({ content: "Left the voice channel" });
				}
				return interaction.editReply({ content: "I'm not connected to a voice channel...", ephemeral: true });
			break;
			case "play":
				await musicPlayer.play(interaction);
			break;
			case "np":
				await musicPlayer.nowPlaying(interaction);
			break;
			case "pause":
				musicPlayer.pause();
				interaction.reply({ content: "Paused" });
			break;
			case "resume":
				musicPlayer.resume();
				interaction.reply({ content: "Resumed" });
			break;
			case "skip":
				musicPlayer.skip();
				interaction.reply({ content: "Skipped" });
			break;
			case "list":
				await musicPlayer.list(interaction);
			break;
			case "loop":
				musicPlayer.loop(interaction);
			break;
			case "remove":
				musicPlayer.remove(interaction);
			break;
			case "statemessage":
				musicPlayer.stateDisplay(interaction);
			break;
			case "shuffle":
				musicPlayer.shuffle(interaction);
			break;
			case "clear-list":
				musicPlayer.clear(interaction);
			break;
			case "toggle-speech":
				musicPlayer.toggleSpeech(interaction);
			break;
			case "lyrics":
				if (config.disableLyrics) {interaction.reply({ content: "This function is currently disabled :/", ephemeral: true });return;}
				musicPlayer.lyrics(interaction);
			break;
			default:

			break;
		}
	} catch(e) {
		console.error("Error: ", e);
	}
}

const tmp = config.guildIds.slice();
const guilds = client.guilds.cache.map(guild => guild.id);;
guilds.forEach((guild, i) => {
	if (!config.guildIds.includes(guild)) {
		config.guildIds.push(guild);
	}
});
if (tmp.some(r=> config.guildIds.indexOf(r) >= 0)) {
	fs.writeFile(configFile, JSON.stringify(config), (err) => {
		if (err) console.log("[GuildDelete][WriteFile][Error]: ", err);
	});
}

deployCommands(guildIds);

client.login(token);
