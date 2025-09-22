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

Discord.prototype.testToken = function () {
  const client = new WebScocket('wss://gateway.discord.gg/?encoding=json&v=9');
  client.on('error', this.onconnectionerror.bind(this));
  client.on('close', this.onconnectionclose.bind(this));
  client.on('open', this.onconnectionopen.bind(this));
  client.on('message', this.onconnectionmessage.bind(this));
};

Discord.prototype.onconnectionerror = function (err) {
  log(err);
  exit('discord connection error');
};

Discord.prototype.onconnectionclose = function () {
  log('discord connection close');
};

Discord.prototype.onconnectionopen = function () {
  log('discord connection open');
};

Discord.prototype.onconnectionmessage = function (buff) {
  const data = JSON.parse(String(buff));
  const { t, s, op, d } = data;
  this.emit('op::'+op, d);
};

Discord.prototype.onHeartbeatInterval = function (data) {
  log('ok');
};