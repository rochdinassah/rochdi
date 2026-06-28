// author: rochdi nassah

'use strict';

module.exports = Logger;

const LEVELS = [
  ['debug', 35],
  ['verbose', 94],
  ['info', 32],
  ['warn', 93],
  ['error', 31]
];

function Logger(opts = {}) {
  const { prefix, level, silent, errcb } = opts;
  
  this.prefix = prefix;
  this.level = level ?? 'verbose';
  this.silent = silent;
  this.errcb = errcb;

  LEVELS.forEach(([l, color], i) => {
    this[l] = silent || i < LEVELS.findIndex(l => level === l[0]) ? noop : function (...args) {
      const msg = format(...args);
      const data = format('\x1b[%dm%s \x1b[0m[%s] %s: %s', color, l.padRight(' '.repeat(7), 7), getTime(true), prefix, msg);
      console.log(data);
    }
  });

  if (errcb)
    process.on('uncaughtException', this.onUncaughtException.bind(this));
}

Logger.prototype.onUncaughtException = function (err) {
  const { errcb } = this;

  const pattern = /(\/.*(\.js|))\:(\d{1,})/;
  const match = pattern.exec(err.stack);

  err.file = match[1].split('/').splice(-2).join('/');

  if (match[2])
    err.file += ':'+match[2];
  
  const { message, file } = err;
  
  this.error('error: '+message);
  this.error('file: '+file);

  errcb(err);
};