'use strict';

//Config
const config = require('./config');
const telegramToken = config.telegramToken;
const witToken = config.witToken;
const ffmpegPath = config.ffmpegPath;

const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const http = require("https");

const ffmpeg = (args = []) => {
  return new Promise((res, rej) => {
    args.unshift('-loglevel error');
    const argString = args.join(' ');
    require('child_process').exec(ffmpegPath + ' ' + argString, (err, stdout, stderr) => {
      if (err) {
        return rej(err);
      }

      if (stderr) {
        return rej(stderr);
      }

      res(stdout);
    });
  });
};

const speechToText = (file) => {
  return new Promise((resolve) => {
    const options = {
      "method": "POST",
      "hostname": "api.wit.ai",
      "port": null,
      "path": "/speech?v=20160706",
      "headers": {
        "authorization": "Bearer " + witToken,
        "content-type": "audio/mpeg3",
        "cache-control": "no-cache"
      }
    };

    const req = http.request(options, function (res) {
      const chunks = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function () {
        const body = Buffer.concat(chunks);
        resolve(JSON.parse(body.toString()));
      });
    });

    fs.createReadStream(file).pipe(req);
  });
};

// Setup polling way
const bot = new TelegramBot(telegramToken, { polling: true });

bot.on('message', function (msg) {
  if (!msg.voice) {
    return;
  }

  bot.downloadFile(msg.voice.file_id, __dirname + '/tmp').then(filePath => {
    const mp3Path = filePath + '.mp3'
    return ffmpeg(['-i ' + filePath, '-acodec libmp3lame', mp3Path]).then((stdout) => {
      //TODO: Add callback & promisify
      fs.unlink(filePath);
      return mp3Path;
    });
  }).then(file => {
    return speechToText(file).then(response => {
      fs.unlink(file);
      return response;
    });
  }).then(response => {
    return response._text;
  }).then(text => {
    const message = msg.from.first_name + ': ' + text;
    bot.sendMessage(msg.chat.id, message, {
      reply_to_message_id: msg.message_id
    });
  }).catch(err => {
    console.log('ERROR', err);
  });
});
