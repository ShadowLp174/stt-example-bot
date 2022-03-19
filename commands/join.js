const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("join")
    .setDescription("Will yonnect to your current voice channel.")
};
