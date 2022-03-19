const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("Fetch the lyrics of the songs, that's playing at the moment.")
}
