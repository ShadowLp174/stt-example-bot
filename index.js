const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const configFile = (process.argv[2]) ? process.argv[2] : './config.json';
const { token } = require(configFile);
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

const musicPlayer = new MusicPlayer(client, configFile, DATA);
musicPlayer.events.on("log", text => console.log("[Music Player][Log] " + text));
musicPlayer.events.on("error", error => console.error("[Music Player][Error] " + error));
musicPlayer.events.on("state", state => console.log("[Music Player][State Update] " + state));

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

const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

async function execute(name, interaction) {
	try {
		switch(name) {
			case "join":
				let s = musicPlayer.join(interaction);
				if (!s) interaction.reply({ content: "Please join a voice channel first", ephemeral: true });
				interaction.reply({ content: "Joined." });
			break;
			case "leave":
				var left = musicPlayer.leave(interaction);

				if (left) {
					interaction.reply({ content: "Left the voice channel" });
					return;
				}
				interaction.reply({ content: "I'm not connected to a voice channel...", ephemeral: true });
			break;
			case "play":
				musicPlayer.play(interaction);
			break;
			case "np":
				musicPlayer.nowPlaying(interaction);
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
				//interaction.reply({ content: "This function is currently disabled :/", ephemeral: true });
				musicPlayer.lyrics(interaction);
			break;
			default:

			break;
		}
	} catch(e) {
		console.error("Error: ", e);
	}
}

client.login(token);
