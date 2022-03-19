const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("statemessage")
    .setDescription("Sends a new message with the current state of the bot.")
}
