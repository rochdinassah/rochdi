// author: rochdi nassah
// created: 2025/09/26

'use strict';

const { format } = require('node:util');

module.exports = Logger;

const LEVELS = ['error', 'info', 'warn', 'verbose', 'debug'];

for (const level of LEVELS) {
  Logger.prototype[level] = function (msg) {
    const data = format('%s [%s] %s: %s', level, getTime(true), this._prefix, msg);
    this._transport.write(data)
  };
}

function Logger(opts = {}) {
  const { prefix } = opts;

  this._prefix = prefix;

  this._transport = new Transport();
}

function Transport() {

}

Transport.prototype.write = function (msg) {
  console.log(msg);
};

