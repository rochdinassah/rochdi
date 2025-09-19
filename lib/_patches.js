// author: rochdi nassah
// created: 2025/09/18

'use strict';

global.exit = (...args) => console.log(...args) || process.exit();
global.log = console.log.bind(console);
global.noop = Function.prototype;

// ::map
Map.prototype.pull = function (key) {
  const val = this.get(key);
  return this.delete(key), val;
};
// ::map

// ::array
Array.prototype.rand = function () {
  return this[Math.floor(this.length*Math.random())];
};

Array.prototype.shuffle = function () {
  for (let i = 0, randomIndex, size = this.length; size > i; ++i) {
    randomIndex = Math.floor(size*Math.random());
    [this[i], this[randomIndex]] = [this[randomIndex], this[i]];
  }
  return this;
};
// ::array

// ::string
String.prototype.padEnd = function () {
  return this;
};

String.prototype.toBase64Url = function () {
  return this.toBase64().replace(/\=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

String.prototype.toBase64 = function () {
  return btoa(this);
};

String.prototype.rand = function () {
  return this.split('').rand();
};

String.prototype.shuffle = function () {
  return this.split('').shuffle().join('');
};

String.prototype.toKebabCase = function () {
  return this.replace(/(_|\s)/g, '-');
};

String.prototype.ucfirst = function () {
  return this.replace(/^([a-z])/, (m, a) => a.toUpperCase());
};
// ::string