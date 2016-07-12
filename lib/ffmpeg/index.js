module.exports = (ffmpegPath, args = []) => {
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
