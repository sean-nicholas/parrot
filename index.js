'use strict';

//Config
const config = require('./config');
const telegramToken = config.telegramToken;
const witToken = config.witToken;
const ffmpegPath = config.ffmpegPath;

const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const _ = require('lodash');
const chatSettings = require('./lib/chatSettings');
const ffmpeg = require('./lib/ffmpeg');
const speechToText = require('./lib/speechToText');
const commands = require('./lib/commands');

// Setup polling way
const bot = new TelegramBot(telegramToken, { polling: true });
commands.commandEvent(bot, config.botName);

const setLanguage = function(msg, lngText) {
  const replyMarkup = {reply_markup: {hide_keyboard: true}};
  const language = _.upperCase(lngText);

  if (!witToken[language]) {
    bot.sendMessage(msg.chat.id, 'Parrot does not know this language *flies away*', replyMarkup);
    return;
  }

  chatSettings.set(msg.chat.id, { 'language': language }).then(() => {
    if (language == 'DE'){
      bot.sendMessage(msg.chat.id, 'Parrot versteht jetzt deutsch!', replyMarkup);
    } else if (language == 'EN') {
      bot.sendMessage(msg.chat.id, 'Parrot is now listening to english!', replyMarkup);
    }
  }).catch((err) => {
    bot.sendMessage(msg.chat.id, 'Ahhh error, errrorrrrrrr!', replyMarkup);
    console.log('Language change err', err);
  });
}

chatSettings.load().then(() => {
  bot.on('message', function (msg) {
    console.log(msg);
    if (!msg.voice) {
      return;
    }

    bot.downloadFile(msg.voice.file_id, __dirname + '/tmp').then(filePath => {
      const mp3Path = filePath + '.mp3'
      return ffmpeg(ffmpegPath, ['-i ' + filePath, '-acodec libmp3lame', mp3Path]).then((stdout) => {
        //TODO: Add callback & promisify
        fs.unlink(filePath);
        return mp3Path;
      });
    }).then(file => {
      return speechToText(witToken, file, chatSettings.get(msg.chat.id).language).then(response => {
        fs.unlink(file);
        return response;
      });
    }).then(response => {
      return response._text;
    }).then(text => {
      if(text === null || text === ""){
        var transcribingErrorMessage = 'ArrArr ' + msg.from.first_name + ', ';
        const language = chatSettings.get(msg.chat.id).language;
        if(language === 'DE'){
          transcribingErrorMessage += 'das kann doch keiner verstehen!'
        }else if(language === 'EN'){
          transcribingErrorMessage += 'nobody can understand this!'
        }
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

  bot.onCommand("/setlanguage", function (msg, match) {
    console.log(match);
    const language = _.upperCase(match[1]);

    if (witToken[language]){
      setLanguage(msg, language);
    } else {
      const keyboardOpts = {
        reply_markup: {
          keyboard: [['DE'], ['EN']],
          one_time_keyboard: true,
          selective: true
        }
      };

      bot.sendMessage(msg.chat.id, 'Which language?', keyboardOpts).then(() => {
        chatSettings.set(msg.chat.id, { 'waitForLanguageResponse': true });
      });
  }

  bot.onText(/(DE)|(EN)/, function(msg, match){
      if (!chatSettings.get(msg.chat.id).waitForLanguageResponse) {
        return;
      }
      setLanguage(msg, match[0]);
      chatSettings.set(msg.chat.id, { 'waitForLanguageResponse': false });
    })
  });
});
