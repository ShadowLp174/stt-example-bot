const { EndBehaviorType, VoiceReceiver } = require('@discordjs/voice');
const { pipeline, Readable } = require("stream");
const witClient = require('node-witai-speech');
const coqui = require("stt");
const prism = require("prism-media");
const util = require('util');
const fs = require("fs");

const model_load_start = process.hrtime();
const model = new coqui.Model("./models/en.tflite");
model.enableExternalScorer("./models/en.scorer");
const model_load_end = process.hrtime(model_load_start);
console.error('Loaded model in %ds.', model_load_end);

class Transcriber {
  constructor(apiKey) {
    this.WITAPIKEY = apiKey;
    this.witAI_lastcallTS = null;

    return this;
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async convert_audio(input) {
    try {
      // stereo to mono channel
      const data = new Int16Array(input)
      const ndata = new Int16Array(data.length/2)
      for (let i = 0, j = 0; i < data.length; i+=4) {
        ndata[j++] = data[i]
        ndata[j++] = data[i+1]
      }
      return Buffer.from(ndata);
    } catch (e) {
      console.log('convert_audio: ', e)
      throw e;
    }
  }

  async transcribe(buffer, raw) {
    try {
      if (this.witAI_lastcallTS != null) {
        let now = Math.floor(new Date());
        while (now - this.witAI_lastcallTS < 1000) {
          await this.sleep(100);
          now = Math.floor(new Date());
        }
      }
      const extractSpeechIntent = util.promisify(witClient.extractSpeechIntent);
      var stream = Readable.from(buffer);
      const contenttype = "audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little"
      var output = await extractSpeechIntent(this.WITAPIKEY, stream, contenttype);
      this.witAI_lastcallTS = Math.floor(new Date());
      if (raw) return output;
      if (typeof output == "object") return output;
      output = output.split("\n").map((item) => item.trim()).join("");
      let idx = output.lastIndexOf("}{");
      let idx0 = output.lastIndexOf("}");
      output = JSON.parse(output.substring(idx + 1, idx0 + 1).trim().replace(/\n/g, "").trim());
      output.text = output.text.replace(/\./g, "");
      stream.destroy();
      return output;
    } catch(e) {
      console.log("Transcriber-error: ", e);
      return {}
    }
  }
  async transcribeCoqui(buffer) {
    try {
      console.log(model.stt(buffer));
    } catch(e) {
      console.log("Transcriber-error (Coqui): ", e);
    }
    return false;
  }

  listen(receiver, userId, user) {
    return new Promise(async (res, rej) => {
      const stream = receiver.subscribe(userId, {
    		end: {
    			behavior: EndBehaviorType.AfterSilence,
    			duration: 300,
    		}
      });

      const decoder = new prism.opus.Decoder({ frameSize: 960, channels: 2, rate: 48000 });
      stream.pipe(decoder);

      let buffer = [];
      decoder.on("data", (data) => {
        buffer.push(data);
      });
      decoder.on("end", async () => {
        buffer = Buffer.concat(buffer);
        const duration = buffer.length / 48000 / 2;
        if (duration > 1.0 || duration < 19) {
          await this.transcribeCoqui(await this.convert_audio(buffer));
          let transcript = await this.transcribe(await this.convert_audio(buffer));
          res({user: user, transcript: transcript });
        }
      })
    });
  }

  init(client) {
    
  }
}

module.exports = Transcriber;
