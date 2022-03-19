const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("toggle-speech")
    .setDescription("Enable/Disable the voice controls")
}
