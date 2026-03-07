// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const readline = require('node:readline');

const { stdin, stdout } = process;

module.exports = CommandManager;

Object.setPrototypeOf(CommandManager.prototype, EventEmitter.prototype);

function CommandManager() {}

CommandManager.prototype.startListen = function () {
  this._interface = readline.createInterface({ input: stdin, output: stdout });
  this._interface.on('close', this.emit.bind(this, 'close'));
  this._interface.on('line', this.onLine.bind(this));
  return this;
};

CommandManager.prototype.stopListen = function () {
  this._interface.removeAllListeners('line');
  this._interface.removeAllListeners('close');
  this._interface.close();
  this._interface = null;
  return this;
};

CommandManager.prototype.onLine = function (line) {
  const [cmd, ...args] = line.trim().split(' ');
  this.emit(cmd, ...args);
};

CommandManager.prototype.close = function () {
  if (this._interface)
    this._interface.close();
};