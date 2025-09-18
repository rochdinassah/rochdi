// author: rochdi nassah
// created: 2025/09/18

'use strict';

global.exit = (...args) => console.log(...args) || process.exit();
global.log = console.log.bind(console);
global.noop = Function.prototype;

// ::string
String.prototype.ucfirst = function () {
  return this.replace(/^([a-z])/, (m, a) => a.toUpperCase());
};
// ::string