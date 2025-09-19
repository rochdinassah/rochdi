// author: rochdi nassah
// created: 2025/09/18

'use strict';

const http2 = require('node:http2');

const timers_registry = new Map();
exports.startTimer = function (label) {
  if (timers_registry.has(label))
    throw new Error('startTimer: timer "'+label+'" already exists');
  timers_registry.set(label, new Date());
  return true;
};

exports.endTimer = function (label, format = true) {
  if (!timers_registry.has(label))
    throw new Error('endTimer: timer "'+label+'" doesn\'t exist');
  const timer = timers_registry.pull(label);
  const diff = new Date()-timer;
  return format ? exports.formatDuration(diff) : diff;
};

exports.getTime = function (seconds = false) {
  const date = new Date();
  let time = date.getHours()+':'+date.getMinutes();
  if (seconds)
    time += ':'+date.getSeconds();
  return time;
};

const LOWERCASE = 'abcdefghijklmopqrstvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTVXYZ';
const NUMBERS = '0123456789';
exports.randomString = function (size, opts = {}) {
  const { useNumbers, extra } = opts;

  const characters = [ ...LOWERCASE, ...UPPERCASE ];

  if (useNumbers ?? true)
    characters.push(...NUMBERS);
  if (extra)
    characters.push(...extra);

  for (var i = 0, out = ''; size > i; ++i) {
    out += characters.rand();
  }

  return out;
};

const DURATION_UNITS = [
  [864e5, ' day'],
  [36e5, ' hour'],
  [6e4, ' minute'],
  [1e3, ' second'],
  [1, 'ms']
];
exports.formatDuration = function (milliseconds) {
  milliseconds = parseInt(milliseconds);
  const result = [];
  let labelCount;

  for (const [val, label] of DURATION_UNITS) {
    if (val > milliseconds)
      continue;
    labelCount = Math.floor(milliseconds/val);
    milliseconds -= val*labelCount;
    if (2 === result.push(labelCount+label+(1 < labelCount && 'ms' !== label ? 's' : '')))
      break;
  }

  return result.join(', ');
};

exports.rand = function (min, max) {
  return Math.floor(min+((1+max-min)*Math.random()));
};

exports.hasInternetAccess = function () {
  return new Promise(resolve => {
    http2.connect('https://google.com')
      .on('error', () => {
        resolve(false);
      })
      .on('connect', function () {
        this.destroy();
        resolve(true);
      });
  });
};

exports.awaitInternet = function () {
  return exports.hasInternetAccess().then(hasAccess => {
    if (!hasAccess)
      return new Promise(resolve => setTimeout(() => resolve(exports.awaitInternet()), 4e3));
  });
};