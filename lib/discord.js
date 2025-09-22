// author: rochdi nassah
// created: 2025/09/22

'use strict';

const WebScocket = require('ws');
const EventEmitter = require('node:events');

module.exports = Discord;

Discord.prototype = new EventEmitter();

function Discord(token) {
  this.token = token;

  this.on('op::10', this.onHeartbeatInterval);
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

  client.on('message', buff => {
    const data = JSON.parse(String(buff));
    const { t, s, op, d } = data;
    this.emit('op::'+op, d);
  });
};

Discord.prototype.onHeartbeatInterval = function (data) {
  log('ok');
};