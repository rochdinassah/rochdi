// author: rochdi nassah
// created: 2025/09/18

'use strict';

const http2 = require('node:http2');
const crypto = require('node:crypto');

const { createHash, createCipheriv, createDecipheriv } = crypto;

global.encrypt = function (plaintext, password = '') {
  if ('string' !== typeof password || !password.length)
    throw new Error('decrypt: expects a non-empty string password, "'+password+'"('+typeof password+') is given');
  const hash = createHash('md5');
  hash.update(password);
  const key = hash.digest('hex');
  const iv = Buffer.alloc(16);
  const cipher = createCipheriv('aes256', key, iv);
  cipher.setEncoding('base64');
  cipher.write(plaintext);
  cipher.end();
  return cipher.read();
};

global.decrypt = function (ciphertext, password = '') {
  if ('string' !== typeof password || !password.length)
    throw new Error('decrypt: expects a non-empty string password, "'+password+'"('+typeof password+') is given');
  const hash = createHash('md5');
  hash.update(password);
  const key = hash.digest('hex');
  const iv = Buffer.alloc(16);
  const decipher = createDecipheriv('aes256', key, iv);
  decipher.write(ciphertext, 'base64');
  decipher.on('error', noop);
  decipher.end();
  return String(decipher.read());
};

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
    return false;
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
  for (var result = [], divider, label, rem = milliseconds, val, i = 0; DURATION_UNITS.length > i; ++i) {
    [divider, label] = DURATION_UNITS[i];
    if (divider > rem)
      continue;
    val = Math.floor(rem/divider);
    rem %= divider;
    if (2 === result.push(val+label+(1 < val && 'ms' !== label ? 's' : '')))
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