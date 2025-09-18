// author: rochdi nassah
// created: 2025/09/18

'use strict';

function rand(min, max) {
  return Math.floor(min+((1+max-min)*Math.random()));
}

global.exit = (...args) => console.log(...args) || process.exit();
global.log = console.log.bind(console);
global.noop = Function.prototype;

// ::array
Array.prototype.rand = function () {
  return this[Math.floor(this.length*Math.random())];
};

Array.prototype.shuffle = function () {
  for (let i = 0, randomIndex, size = this.length; size > i; ++i) {
    randomIndex = rand(0, size-1);
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