// author: rochdi nassah
// created: 2025/09/30

'use strict';

const EventEmitter = require('node:events');
const readline = require('node:readline');

const { stdin, stdout } = process;

module.exports = Command;

Object.setPrototypeOf(Command.prototype, EventEmitter.prototype);

function Command() {}

Command.prototype.run = function () {
  this._interface = readline.createInterface({ input: stdin, output: stdout });
  this._interface.on('close', this.emit.bind(this, 'close'));
  this._interface.on('line', this.online.bind(this));
  return this;
};

Command.prototype.online = function (line) {
  log(line, line.length);
  this.end();
};

Command.prototype.end = function () {
  if (this._interface)
    this._interface.close();
};