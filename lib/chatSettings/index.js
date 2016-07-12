'use strict';

const fs = require('fs-promise');
const _ = require('lodash');
const settingsFile = __dirname + '/settings.json';
let chatSettings = {};

const load = () => {
  return fs.exists(settingsFile).then(exists => {
    if (!exists) {
      return fs.writeJson(settingsFile, {});
    }

    return exists;
  }).then(() => {
    return fs.readJson(settingsFile);
  }).then((data) => {
    chatSettings = data;
  }).catch(err => {
    console.log('err', err);
  });
}

const get = (chatId) => {
  return chatSettings[chatId] || {};
}

const set = (chatId, newSettings) => {
  let settings = (chatSettings[chatId] || {});
  settings = _.assign(settings, newSettings);
  chatSettings[chatId] = settings;
  return fs.writeJson(settingsFile, chatSettings);
}

module.exports = {
  load: load,
  get: get,
  set: set
}
