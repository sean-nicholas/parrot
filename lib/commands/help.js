'use strict';

module.exports = function(bot) {
  bot.onCommand('/help', function(msg) {
    let text = require('./parrotDescription')
    text += `

To change the langugage use the /setlanguage command. I will ask you which one to use.`
    bot.sendMessage(msg.chat.id, text);
  });
}
