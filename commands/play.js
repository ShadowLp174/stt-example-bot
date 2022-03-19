const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Will play some example music")
    .addStringOption(option =>
      option.setName("song")
        .setDescription("The youtube song/url you want to play")
        .setRequired(true))
};
