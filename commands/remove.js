const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a specific item from the queue.")
    .addNumberOption(option =>
      option.setName("index")
        .setDescription("The position of the song in the queue. Visible using /list.")
        .setRequired(true))
}
