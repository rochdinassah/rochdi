// author: rochdi nassah
// created: 2025/09/22

'use strict';

const WebScocket = require('ws');
const EventEmitter = require('node:events');

WebScocket.prototype[Symbol.for('send')] = WebScocket.prototype.send;
WebScocket.prototype.send = function (data) {
  this[Symbol.for('send')](JSON.stringify(data));
};

module.exports = Discord;

Discord.prototype = new EventEmitter();

function Discord(token) {
  this.token = token;
  
  this.on('op::10', this.onHeartbeatInterval);
  this.on('op::11', this.onHeartbeatAck);

  this.connect();
}

Discord.prototype.connect = function () {
  const connection = this.connection = new WebScocket('wss://gateway.discord.gg/?encoding=json&v=9');
  connection.on('error', this.onconnectionerror.bind(this));
  connection.on('close', this.onconnectionclose.bind(this));
  connection.on('open', this.onconnectionopen.bind(this));
  connection.on('message', this.onconnectionmessage.bind(this));
};

Discord.prototype.testToken = function () {
  
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
  this._seq = s;
  this.emit('op::'+op, d);
};

Discord.prototype.onHeartbeatInterval = function (data) {
  const { heartbeat_interval } = data;

  clearInterval(this._heartbeatIntervalId);
  const p = { op: 40, d: { seq: this._seq } };

  this.connection.send(p);
  // this._heartbeatIntervalId = setInterval(() => {

  //   this.connection.send(JSON.stringify({ op: 1, s: this._seq }));
  // }, 1e3);
  log('heartbeat interval set to', formatDuration(heartbeat_interval));
};

Discord.prototype.onHeartbeatAck = function () {
  log('heartbeat ack');
};