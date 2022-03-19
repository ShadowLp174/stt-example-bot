# Discord Music Bot with Voice Commands

This is a basic music bot that also has the ability to listen to voice commands.

*This project is still full of bugs, if you encounter a bug, feel free to create an issue in the issues tab*

## Installation

- Clone this repository
- run `npm install`
- [Aquire your bot's auth credentials](https://discordjs.guide/preparations/setting-up-a-bot-application.html#setting-up-a-bot-application) and fill them out in the config.json file (token, clientId). When you invite the bot to the server, make sure to give it the applications.command permissions. You also need to get the id of the server the bot is going to be in. To get this, make sure that the "Developer Settings" in Discord are activated and right-click the icon of your server. At the bottom of the dropdown-menu there should be something like "copy server id". Click it. Paste the copied id into the config.json file.
- Now run `node command-deployer.js`. If everything is set up well, the program should finish without errors and the message 'Successfully reloaded application (/) commands.' should pop up.
- Now you need the required api keys.
  - Head over to wit.ai and register/login. Create a new application and open the settings section. Click on the `client access token` to copy it.
  - Now paste the copied token into the config.json file
  - get a youtube API key as described [here](https://blog.hubspot.com/website/how-to-get-youtube-api-key)
  - paste it into the config.json file
  - Finally, get a genius API key (used for lyrics)
  - Head over to the [genius api site](https://genius.com/api-clients) and create a client. Generate an access token and copy it. Put it in the config.json
- You're ready! :D

## Running

- Execute `node index.js`
- Have fun :)

## Usage

- All commands are listen when you enter a "/"
- `/play <playlist-url/url/query>` will put the respective video or videos in the queue and start playing.
- The other commands are like normal music commands and described in the drop-down in the command list.
- **Voice commands**:
  - **Important**: to enable the voice commands. You have to execute the command `toggle-speech` first!
  - All voice commands start with `music`
  - There are: `play, pause, resume, skip, shuffle, list`
  - For example: `music play <some song>`

## Voice Transcriber

The voice transcriber used to translate the spoken things to text is also available as an independent module. Look it up on [Github](https://github.com/shadowlp174/discord-stt) or on [NPM](https://www.npmjs.com/package/discord-speech-to-text).


*This bot is not perfect. Please contact me through GitHub or similar if you have any problems :)*
