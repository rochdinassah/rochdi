// author: rochdi nassah
// created: 2025/09/30

'use strict';

const EventEmitter = require('node:events');

module.exports = Command;

Object.setPrototypeOf(Command.prototype, EventEmitter.prototype);

function Command() {}

Command.prototype.run = function () {
  return this;
};