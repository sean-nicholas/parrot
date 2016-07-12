module.exports = function(bot) {
  bot.onCommand('/stop', function(msg) {
    const text = `To stop me just remove me from your conversation.`;
    bot.sendMessage(msg.chat.id, text);
  });
}
