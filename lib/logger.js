// author: rochdi nassah
// created: 2025/09/26

'use strict';

const { format } = require('node:util');
const fs = require('node:fs');

module.exports = Logger;

const LEVELS = [['error', 31], ['info', 32], ['warn', 93], ['verbose', 94], ['debug', 35]];

for (const [level, color] of LEVELS) {
  Logger.prototype[level] = function (msg) {
    const data = format(
      '\x1b[%dm%s \x1b[0m[%s] %s: %s',
      color,
      level,
      getTime(true),
      this._prefix,
      msg
    );
    // fs.writeFileSync(process.stdout.fd, "\e[32mhello")
    this._transport.write(data);
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

