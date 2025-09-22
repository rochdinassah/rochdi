// author: rochdi nassah
// created: 2025/09/22

'use strict';

const WebScocket = require('ws');

module.exports = Discord;

function Discord(token) {
  this.token = token;
}

Discord.prototype.testToken = function (token) {
  const client = new WebScocket('wss://gateway.discord.gg/?encoding=json&v=9');

  client.on('error', err => {
    log('discord connection error');
  });
  client.on('close', () => {
    log('discord connection close');
  });
  client.on('open', () => {
    log('discord connection open');
  });
};