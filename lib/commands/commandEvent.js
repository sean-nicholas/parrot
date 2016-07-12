module.exports = function (bot, botName) {
  bot.onCommand = function (command, callback) {
    /*
    * RegExp:
    * ^ ==> must start with a /
    * (?: |$|@parrotparrot_bot ?) ==>
    *   ?: ==> don't capture
    *    |$|@botName ? ==> either space, line-end, or botName with an optional space
    * (.*) ==> paramters
    */
    const botCommand = new RegExp('^' + command + '(?: |$|@' + botName + ' ?)(.*)');
    console.log(botCommand);
    bot.onText(botCommand, callback);
  }
}
