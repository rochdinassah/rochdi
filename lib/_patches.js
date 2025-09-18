// author: rochdi nassah
// created: 2025/09/18

'use strict';

global.exit = (...args) => console.log(...args) || process.exit();
global.log = console.log.bind(console);
global.noop = Function.prototype;

// ::map
Map.prototype._timers = new Map();

Map.prototype._get = Map.prototype.get;
Map.prototype.get = function (key, valueToSetIfMissing) {
  if (!this.has(key) && void 0 !== valueToSetIfMissing) {
    this.set(key, valueToSetIfMissing);
  }
  return this._get(key);
};

Map.prototype.remember = function (key, value, duration) {
  clearTimeout(this._timers[key]);
  this._timers[key] = setTimeout(this.delete.bind(this, key), duration);
  this.set(key, value);
};
// ::map

// ::array
Array.prototype.rand = function () {
  return this[Math.floor(this.length*Math.random())];
};

Array.prototype.shuffle = function () {
  for (let i = 0, randomIndex, size = this.length; size > i; ++i) {
    randomIndex = Math.floor(size*Math.random());
    log(randomIndex);
    [this[i], this[randomIndex]] = [this[randomIndex], this[i]];
  }
  return this;
};
// ::array

// ::string
String.prototype.toKebabCase = function () {
  return this.replace(/(_|\s)/g, '-');
};

String.prototype.ucfirst = function () {
  return this.replace(/^([a-z])/, (m, a) => a.toUpperCase());
};
// ::string