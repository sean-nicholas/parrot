const _ = require('lodash');

module.exports = function(bot, chatSettings, witToken) {
  const setLanguage = function(msg, lngText) {
    const replyMarkup = { reply_markup: { hide_keyboard: true } };
    const language = _.upperCase(lngText);

    if (!witToken[language]) {
      bot.sendMessage(msg.chat.id, 'Parrot does not know this language *flies away*', replyMarkup);
      return;
    }

    chatSettings.set(msg.chat.id, { 'language': language }).then(() => {
      const locale = require('../../locales/' + language);
      bot.sendMessage(msg.chat.id, locale.changedLanguage, replyMarkup);
    }).catch((err) => {
      bot.sendMessage(msg.chat.id, 'Ahhh error, errrorrrrrrr!', replyMarkup);
      console.log('Language change err', err);
    });
  }

  bot.onCommand("/setlanguage", function (msg, match) {
    //Language was directly provided
    if (match[1]) {
      return setLanguage(msg, match[1]);
    }

    //Ask which language
    const keyboardOpts = {
      reply_markup: {
        keyboard: [_.keys(witToken)],
        one_time_keyboard: true,
        selective: true
      }
    };

    bot.sendMessage(msg.chat.id, 'Which language?', keyboardOpts).then(() => {
      chatSettings.set(msg.chat.id, { 'waitForLanguageResponse': true });
    });
  });

  bot.on('message', function(msg, match) {
    if (!chatSettings.get(msg.chat.id).waitForLanguageResponse) {
      return;
    }

    setLanguage(msg, msg.text);
    chatSettings.set(msg.chat.id, { 'waitForLanguageResponse': false });
  });
}
