// author: rochdi nassah
// created: 2025/09/18

'use strict';

const http2 = require('node:http2');
const crypto = require('node:crypto');

const { createHash, createCipheriv, createDecipheriv } = crypto;

global.create_md5 = function (data = '') {
  if (!data || !data.length)
    throw new Error('create_md5: expects a non-empty string data, "'+data+'"('+typeof data+') is given');
  return createHash('md5').update(data).digest('hex');
};

global.encrypt = function (plaintext, password = '') {
  if ('string' !== typeof password || !password.length)
    throw new Error('encrypt: expects a non-empty string password, "'+password+'"('+typeof password+') is given');
  if ('string' !== typeof plaintext)
    throw new Error('encrypt: plaintext must be of type "string", "'+typeof plaintext+'" is given');

  const key = create_md5(password);
  const iv = Buffer.alloc(16);
  const cipher = createCipheriv('aes256', key, iv);

  cipher.write(plaintext);

  return cipher.setEncoding('base64').end().read();
};

global.decrypt = function (ciphertext, password = '') {
  if ('string' !== typeof password || !password.length)
    throw new Error('decrypt: expects a non-empty string password, "'+password+'"('+typeof password+') is given');
  if ('string' !== typeof ciphertext)
    throw new Error('decrypt: ciphertext must be of type "string", "'+typeof ciphertext+'" is given');

  const key = create_md5(password);
  const iv = Buffer.alloc(16);
  const decipher = createDecipheriv('aes256', key, iv);

  decipher.write(ciphertext, 'base64');

  return String(decipher.on('error', noop).end().read());
};

global.parse_headers = function (raw) {
  const match = Array.from(/([a-zA-Z0-9-_]+)\:\s(.*)/g[Symbol.matchAll](raw));
  const headers = {};
  match.forEach(e => headers[e[1]] = e[2]);
  exit(headers);
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

global.getTime = function (withSeconds = false) {
  const date = new Date();
  const units = [
    date.getHours(),
    date.getMinutes()
  ];
  if (withSeconds)
    units.push(date.getSeconds());
  return units.map(unit => 1 === String(unit).length ? '0' + String(unit) : String(unit)).join(':');
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