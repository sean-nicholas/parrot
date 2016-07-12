module.exports = function(bot) {
  bot.onCommand('/start', function(msg) {
    bot.sendMessage(msg.chat.id, require('./parrotDescription'));
  });
}
