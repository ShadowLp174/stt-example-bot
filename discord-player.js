const { SlashCommandBuilder } = require('@discordjs/builders');
const { AudioPlayerStatus, joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, NoSubscriberBehavior, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const { MessageEmbed } = require("discord.js");
const events = require('events');

const { Worker } = require('worker_threads');

const ytdl = require("ytdl-core");
const yts = require("yt-search");

const Genius = require("genius-lyrics");

const Transcriber = require("discord-speech-to-text");

class VoiceParser {
  constructor(possible) {
    this.possible = possible.map((item) => item.trim().toLowerCase());
    return this;
  }

  parse(string) {
    let output = string.repeat(1);
    string = string.replace("/\./g", "");
    string = string.toLowerCase().replace("music", "").trim();
    if (string.includes(" ")) string = string.split(" ")[0];
    string = string.trim();
    if (!this.possible.includes(string)) return false;
    output = output.replace(/\./g, "").toLowerCase().replace("music", "").trim();
    return output;
  }
}

/*
var DATA = {
	queue: [],
	loop: false,
	volume: 1,
	current: {
    id: "",
    title: ""
  },
	guildId: someId,
  status: "Playing" || "Buffering" || "Idle" || "Paused" || "AutoPaused"
};
*/

class MusicPlayer {
  constructor(client, configFile, data) {
    this.events = new events.EventEmitter();

    this.client = client;
    this.data = data;
    this.config = require(configFile);

    this.YT_API_KEY = this.config.ytApiKey;
    this.DISCORD_CHAR_LIMIT = 1950;

    this.transcriber = new Transcriber(this.config.witAi);
    this.voiceParser = new VoiceParser(["play", "pause", "resume", "skip", "shuffle", "list", "leave"]);

    this.geniusClient = new Genius.Client(this.config.geniusToken);

    this.textChannel = null;

    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    });
    this.player.on(AudioPlayerStatus.Idle, () => {
      this.data.status = "Idle";
      this.current = null;
      this.stateUpdate();
      this.playNext();
    });
    this.player.on(AudioPlayerStatus.Playing, () => {
      this.data.status = "Playing";
      this.stateUpdate();
    });
    this.player.on(AudioPlayerStatus.Buffering, () => {
      this.data.status = "Buffering";
      this.stateUpdate();
    });
    this.player.on(AudioPlayerStatus.AutoPaused, () => {
      this.data.status = "AutoPaused";
      this.stateUpdate();
    });
    this.player.on(AudioPlayerStatus.Paused, () => {
      this.data.status = "Paused";
      this.stateUpdate();
    })

    return this;
  }
  log(data) {
    this.events.emit("log", data);
  }
  error(data) {
    this.events.emit("error", data);
  }
  stateUpdate() {
    this.events.emit("state", this.data.status);
    if (!this.stateMsg) return;
    let message = new MessageEmbed()
      .setColor("#349D43")
      .setTitle(this.data.status)
      .setURL("https://shadowlp174.4lima.de")
      .setDescription("My current status.")
      .setTimestamp()
    this.stateMsg.edit({ embeds: [message] });
  }
  on(event, handler) {
    this.events.on(event, handler);
  }
  once(event, handler) {
    this.events.once(event, handler);
  }

  youtubeParser(url){
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return (match&&match[7].length==11)? match[7] : false;
  }
  playlistParser(url) {
    var match = url.match(/[&?]list=([^&]+)/i);
    return (match || [0,false])[1];
  }
  async search(string) {
    return (await yts(string)).videos[0];
  }
  async fetchPlaylist(id) {
    return (await yts({ listId: id })).videos;
  }
  addToQueue(data) {
    this.data.queue.push(data);
  }

  shuffleArr(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = a[i];
      a[i] = a[j];
      a[j] = x;
    }
    return a;
  }

  shuffle(interaction) {
    if (this.data.queue.length == 0) {interaction.reply({ content: "Queue is empty.", ephemeral: true }); return false;}
    this.data.queue = this.shuffleArr(this.data.queue);
    interaction.reply({ content: "Shuffled queue." });
    return true;
  }

  async addIdToQueue(id) {
    try {
      this.data.queue.push(await yts({ videoId: id }));
      return true;
    } catch(e) {
      this.error("There was error fetching video data: ", e);
      return false;
    }
  }

  playNext() {
    if (this.data.queue.length == 0) {this.data.current = null; return false;}
    const current = this.data.current;
    const data = (this.data.queueSong) ? current : this.data.queue.shift();
    if (current && this.data.loop && !this.data.queueSong) this.data.queue.push(current);

    this.data.volume = 1;
    this.data.current = data;

    const resource = createAudioResource(ytdl("https://www.youtube.com/watch?v=" + data.videoId, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1024*1024*10, // 10mb
      requestOptions: {
        headers: {
          "Cookie": "ID=" + new Date().getTime(),
          "x-youtube-identity-token": this.YT_API_KEY
        }
      }
    }, {highWaterMark: 1}));
    this.player.play(resource);
  }

  getVidName(vid, code) {
    if (code) return vid.title + " (" + vid.duration.timestamp + ") - " + vid.url;
    return "[" + vid.title + " (" + vid.duration.timestamp + ")" + "](" + vid.url + ")";
  }

  msgChunking(msg) {
    let msgs = [[""]];
    let c = 0;
    msg.split("\n").forEach((line, i) => {
      let tmp = msgs[c].slice();
      tmp.push(line);
      if ((tmp.join("") + "\n").length < this.DISCORD_CHAR_LIMIT) {
        msgs[c].push(line + "\n");
      } else {
        msgs[++c] = [line + "\n"];
      }
    });
    msgs = msgs.map(msgChunks => "```" + msgChunks.join("") + "```");
    return msgs;
  }

  listQueue() {
    var text = "--- Queue: ---\n";
    if (this.data.current) text += "[x] " + this.getVidName(this.data.current, true) + "\n";
    this.data.queue.forEach((vid, i) => {
      text += "[" + i + "] " + this.getVidName(vid, true) + "\n";
    });
    if (this.data.queue.length == 0 && !this.data.current) text += "\n--- Empty ---\n\n";
    text += "--------------";
    let textArr = this.msgChunking(text);
    return textArr;
  }
  async list(interaction) {
    await interaction.deferReply();
    let messages = this.listQueue();
    await interaction.editReply("Here's the queue: ");
    interaction.channel.send({ content: messages[0] });
    for (let i = 1; i < messages.length; i++) {
      if (messages[i]) interaction.channel.send({ content: messages[i] });
    }
  }

  loop(interaction) {
    let choice = interaction.options.getString("type");
    if (!["song", "queue"].includes(choice)) {interaction.reply({ content: "Choice not specified", ephemeral: true});return false}
    switch(choice) {
      case "song":
        if (this.data.queueSong) {
          this.data.queueSong = false;
          interaction.reply("Song loop deactivated.");
          return;
        }
        this.data.queueSong = true;
        interaction.reply("Song loop activated");
        return;
      break;
      case "queue":
        if (this.data.loop) {
          this.data.loop = false;
          interaction.reply("Queue loop deactivated.");
          return;
        }
        this.data.loop = true;
        interaction.reply("Queue loop activated");
        return;
      break;
      default:
      break;
    }
  }

  remove(interaction) {
    if (!interaction.options.getNumber("index") && interaction.options.getNumber("index") != 0) {interaction.reply({ content: "Please specify an index", ephemeral: true }); return;}
    let index = interaction.options.getNumber("index");
    if (!this.data.queue[index]) {interaction.reply({ content: "Invalid index.", ephemeral: true }); return;}
    interaction.reply({ content: "Successfully removed **" + this.data.queue[index].title + "** from the queue."});
    this.data.queue.splice(index, 1);
    return;
  }

  resume() {
    return this.player.unpause();
  }
  pause() {
    return this.player.pause();
  }
  skip() {
    this.player.stop();
  }
  clear(interaction) {
    this.data.queue = [];
    interaction.reply({ content: "Queue cleared" });
  }
  async nowPlaying(interaction) {
    await interaction.deferReply();
    if (!this.data.current) {interaction.editReply({ content: "There's nothing playing at the moment."}); return}
    let loopqueue = (this.data.loop) ? "**enabled**" : "disabled";
    let songloop = (this.data.queueSong) ? "**enabled**" : "disabled";
    interaction.editReply({ content: "Playing: **[" + this.data.current.title + "](" + this.data.current.url + ")** (" + this.data.current.duration.timestamp + ")" + "\n\nQueue loop: " + loopqueue + "\nSong loop: " + songloop });
    return true;
  }
  lyrics(interaction) {
    if (!this.data.current) {interaction.reply({ content: "There's nothing playing at the moment."}); return}
    interaction.deferReply();
    this.geniusClient.songs.search(this.data.current.title).then(async (searches) => {
      const lyrics = await searches[0].lyrics(false);
      const msgs = this.msgChunking(lyrics);
      interaction.editReply({ content: "Lyrics for the song **" + this.data.current.title + "**" });
      for (let i = 0; i < msgs.length; i++) {
        interaction.channel.send({ content: msgs[i] });
      }
    });
  }

  toggleSpeech(interaction) {
    if (this.data.speech) {
      this.data.speech = false;
      interaction.reply({ content: "Voice commands disabled." });
      return;
    }
    this.data.speech = true;
    interaction.reply({ content: "Voice commands enabled." });
    return;
  }

  stateDisplay(interaction) {
    if (this.stateMsg) this.stateMsg.unpin();
    let message = new MessageEmbed()
      .setColor("#349D43")
      .setTitle(this.data.status)
      .setURL("https://shadowlp174.4lima.de")
      .setDescription("My current status.")
      .setTimestamp()
    interaction.channel.send({ embeds: [message] }).then((msg) => {this.stateMsg = msg; msg.pin();});
    interaction.reply({ content: "A new status message will be sent." });
  }

  leave() {
    const connection = getVoiceConnection(this.data.guildId);
    if (connection) {
      this.player.stop();
      connection.destroy();
      this.data.current = null;
      this.data.queue = [];
      return true;
    }
    return false;
  }

  async execVoiceCom(cmd) {
    switch(cmd.split(" ")[0]) {
      case "play":
        this.connection = getVoiceConnection(this.data.guildId);
        this.connection.subscribe(this.player);

        const query = cmd.split(" ").slice(1).join(" ");
        if (!query) return;
        this.textChannel.send("Searching for _" + query + "_");
        const worker = new Worker('./worker.js', { workerData: { query: query, type: "voiceCommand" } });
        worker.on("message", (data) => {
          try {
            if (!JSON.parse(data.data)) return false;
            if (data.type == "video") {
              const vid = JSON.parse(data.data);
              this.textChannel.send("Added **" + vid.title + " (" + vid.duration.timestamp + ")** to queue");
              this.addToQueue(vid);
              if (!this.data.current) this.playNext();
            }
          } catch(e) {
            console.error("voiceCmdError: ", e);
          }
        });        
      break;
      case "pause":
        this.player.pause();
        this.textChannel.send("Paused.");
      break;
      case "resume":
        this.player.unpause();
        this.textChannel.send("Resumed.");
      break;
      case "skip":
        this.player.stop();
        this.textChannel.send("Skipped the current song.");
      break;
      case "shuffle":
        if (this.data.queue.length == 0) return;
        this.data.queue = this.shuffleArr(this.data.queue);
        this.textChannel.send("Shuffled Queue");
      break;
      case "list":
        let messages = this.listQueue();
        this.textChannel.send({ content: messages[0] });
        for (let i = 1; i < messages.length; i++) {
          if (messages[i]) this.textChannel.send({ content: messages[i] });
        }
      break;
      case "leave":
        var left = this.leave();
        if (left) return this.textChannel.send({ content: "Left the voice channel" });
        this.textChannel.send({ content: "I'm not connected to a voice channel..." });
      break;
      default:
        console.warn("Suspicios case. Query: ", cmd);
      break;
    }
  }

  join(interaction) {
    if (!interaction.member.voice.channel) {
      return false;
    }
    this.log("Establishing connection");
    this.data.guildId = interaction.member.guild.id;
    this.textChannel = interaction.channel;
    let channel = interaction.member.guild.channels.cache.get(interaction.member.voice.channel.id);
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });
    connection.receiver.speaking.on("start", (userId) => {
      if (this.data.speech) {
        const user = this.client.users.cache.get(userId);
        this.log("Listening to " + user.username);
        this.transcriber.listen(connection.receiver, userId, user).then((data) => {
          if (!data.transcript.text) return;
          let parsed = this.voiceParser.parse(data.transcript.text);
          if (!parsed) {return;}
          this.execVoiceCom(parsed);
        });
      }
    });
    connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
    	try {
        this.log("Reconnecting to voice channel...");
    		await Promise.race([
    			entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
    			entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
    		]);
    		// Seems to be reconnecting to a new channel - ignore disconnect
    	} catch (error) {
        this.error("Disconnected from voice channel!");
        this.data.current = null;
    		connection.destroy();
    	}
    });

    return true;
  }

  async play(interaction) {
    await interaction.deferReply();
    if (!getVoiceConnection(interaction.member.guild.id)) {
      this.join(interaction);
    }
    this.connection = getVoiceConnection(interaction.member.guild.id);
    this.connection.subscribe(this.player);

    if (!interaction.options.getString("song")) return false;
    var query = interaction.options.getString("song");
    var res = false;

    const worker = new Worker('./worker.js', { workerData: { query: query, type: "command" } });
    worker.on("message", (data) => {
      data = JSON.parse(data);
      res = true;
      if (data) {
        switch (data.type) {
          case "list":
            let videos = data.data;
            videos.forEach((vid, i) => {
              this.addToQueue(vid);
            });
            if (!this.data.current) this.playNext();
          break;
          case "video":
            let vid = data.data;
            this.addToQueue(vid);
            if (!this.data.current) this.playNext();
          break;
          default:
            interaction.editReply(data);
          break;
        }
      }
    });
    worker.on("exit", (code) => {
      if (!res) interaction.editReply("There was either an error or no results were found.");
    })
  }
}

module.exports = MusicPlayer;
