// author: rochdi nassah
// created: 2025/09/26

'use strict';

module.exports = Logger;

const LEVELS = ['error', 'info', 'warn', 'verbose', 'debug'];

for (const level of LEVELS) {
  Logger.prototype[level] = function (msg) {

  };
}

function Logger() {}

