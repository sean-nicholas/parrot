'use strict';

//Config
const config = require('./config');
const telegramToken = config.telegramToken;
const witToken = config.witToken;
const ffmpegPath = config.ffmpegPath;

const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const http = require('https');
const _ = require('lodash');
const chatSettings = require('./chatSettings');

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

const speechToText = (file, language) => {
  return new Promise((resolve) => {
    if (!witToken[language]) {
      language = 'EN';
    }

    const options = {
      "method": "POST",
      "hostname": "api.wit.ai",
      "port": null,
      "path": "/speech?v=20160706",
      "headers": {
        "authorization": "Bearer " + witToken[language],
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

var waitForResponse = false;
var setLanguage = function(msg, lngText){
  const replyMarkup = {reply_markup: {hide_keyboard: true}};
  const language = _.upperCase(lngText);
  if (!witToken[language]) {
    bot.sendMessage(msg.chat.id, 'Parrot does not know this language *flies away*', replyMarkup);
    return;
  }
  chatSettings.set(msg.chat.id, { 'language': language }).then(() => {
    if(language == 'DE'){
      bot.sendMessage(msg.chat.id, 'Parrot versteht jetzt deutsch!', replyMarkup);
    }else if (language == 'EN') {
      bot.sendMessage(msg.chat.id, 'Parrot is now listening to english!', replyMarkup);
    }

  }).catch((err) => {
    bot.sendMessage(msg.chat.id, 'Ahhh error, errrorrrrrrr!', replyMarkup);
    console.log('Language change err', err)
  });
}

chatSettings.load().then(() => {
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
      return speechToText(file, chatSettings.get(msg.chat.id).language).then(response => {
        fs.unlink(file);
        return response;
      });
    }).then(response => {
      return response._text;
    }).then(text => {
      if(text === null){
        const transcribingErrorMessage = 'ArrArr ' + msg.from.first_name + ', das kann doch keiner verstehen!'
        bot.sendMessage(msg.chat.id, transcribingErrorMessage, {
          reply_to_message_id: msg.message_id
        });
        return;
      }
      const message = msg.from.first_name + ': ' + text;
      bot.sendMessage(msg.chat.id, message, {
        reply_to_message_id: msg.message_id
      });
    }).catch(err => {
      console.log('ERROR', err);
    });
  });

  bot.onText(/\/setlanguage (.+)|\/setlanguage/, function (msg, match) {
    const language = _.upperCase(match[1]);

    if (witToken[language]){
      setLanguage(msg, language);
    }else{
      const keyboardOpts = {reply_markup:{keyboard: [['DE'], ['EN']], one_time_keyboard: true, selective: true}}
      bot.sendMessage(msg.chat.id, 'Which language?', keyboardOpts).then(() => {
      waitForResponse = true;
    });
  }
  bot.onText(/(DE)|(EN)/, function(msg, match){
      if(!waitForResponse){
        return;
      }
      setLanguage(msg, match[0]);
      waitForResponse = false;
    })
  });
});
