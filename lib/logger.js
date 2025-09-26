// author: rochdi nassah
// created: 2025/09/26

'use strict';

const { format } = require('node:util');

module.exports = Logger;

const LEVELS = [['error', 31], ['info', 32], ['warn', 93], ['verbose', 94], ['debug', 35]];

for (const [level, color] of LEVELS) {
  Logger.prototype[level] = function (msg) {
    const {silent, prefix, transport } = this;

    if (silent)
      return;

    const data = format('\x1b[%dm%s \x1b[0m[%s] %s: %s', color, level.padRight(' '.repeat(7), 7), getTime(true), prefix, msg);

    transport.write(data);
  };
}

function Logger(opts = {}) {
  const { prefix, silent, errcb } = opts;

  this.prefix = prefix;
  this.silent = silent;
  this.errcb = errcb;

  this.transport = new Transport();

  process.on('uncaughtException', this.onuncaughtexception.bind(this));
}

Logger.prototype.onuncaughtexception = function (err) {
  const { errcb } = this;

  const pattern = /(\/.*\.js)\:(\d{1,})/;

  const match = pattern.exec(err.stack);

  err.file = match[1].split('/').splice(-2).join('/')+':'+match[2];

  const { message, file } = err;

  this.error('error: '+message);
  this.error('file: '+file);

  if (errcb)
    errcb(err);
  else
    process.exit(1);
};

function Transport() {}
Transport.prototype.write = function (msg) {
  console.log(msg);
};
