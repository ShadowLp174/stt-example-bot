const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Toggle the loop.")
    .addStringOption(option =>
      option.setName("type")
        .setDescription("The type of the loop")
        .setRequired(true)
        .addChoice("Song", "song")
        .addChoice("Queue", "queue"))
}
