// author: rochdi nassah
// created: 2025/09/18

'use strict';

const http2 = require('node:http2');

const timers_registry = new Map();
global.startTimer = function (label) {
  if (timers_registry.has(label))
    return false;
  timers_registry.set(label, new Date());
  return true;
};

global.endTimer = function (label, format = true) {
  const timer = getTimer(label, format);
  timers_registry.delete(label);
  return timer;
};

global.getTimer = function (label, format = true) {
  if (!timers_registry.has(label))
    throw new Error('getTimer: timer "'+label+'" doesn\'t exist');
  const timer = timers_registry.get(label);
  const diff = new Date()-timer;
  return format ? formatDuration(diff) : diff;
};

global.getTime = function (seconds = false) {
  const date = new Date();
  let time = date.getHours()+':'+date.getMinutes();
  if (seconds)
    time += ':'+date.getSeconds();
  return time;
};

const LOWERCASE = 'abcdefghijklmopqrstvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTVXYZ';
const NUMBERS = '0123456789';
global.randomString = function (size, opts = {}) {
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
global.formatDuration = function (milliseconds) {
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

global.rand = function (min, max) {
  return Math.floor(min+((1+max-min)*Math.random()));
};

global.hasInternetAccess = function () {
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

global.awaitInternet = function () {
  return hasInternetAccess().then(hasAccess => {
    if (!hasAccess)
      return new Promise(resolve => setTimeout(() => resolve(awaitInternet()), 4e3));
  });
};