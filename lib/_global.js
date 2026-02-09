// author: rochdi nassah

'use strict';

const exit_callbacks = [];

process.exit = function () {
  require('node:child_process').execSync('kill -9 '+this.pid);
};

for (const sig of ['INT', 'HUP', 'TERM', 'QUIT', 'USR1', 'USR2'])
  process.on('SIG'+sig, onProcessExit);

async function onProcessExit(signal, code) {
  for (const cb of exit_callbacks)
    await cb();
  this.exit(code);
}

const http2 = require('node:http2');
const crypto = require('node:crypto');
const tls = require('node:tls');
const util = require('node:util');

global.onExit = function (cb) {
  exit_callbacks.push(cb);
};

global.probabilityCallback = function (percentage, callback, ...args) {
  if (parseFloat(percentage) >= 0.0000000000000001+(100*Math.random()))
    callback(...args);
};

global.asyncDelay = function (ms) {
  return new Promise(resolve => setTimeout(resolve, Math.min(ms, 2**32/2-1)));
};

global.format = util.format;

global.createMd5 = function (data = '') {
  if (!data || !data.length)
    throw new Error('createMd5: expects a non-empty string data, "'+data+'"('+typeof data+') is given');
  return crypto.createHash('md5').update(data).digest('hex');
};

global.encrypt = function (plaintext, password = '') {
  if ('string' !== typeof password || !password.length)
    throw new Error('encrypt: expects a non-empty string password, "'+password+'"('+typeof password+') is given');
  if ('string' !== typeof plaintext)
    throw new Error('encrypt: plaintext must be of type "string", "'+typeof plaintext+'" is given');

  const key = createMd5(password);
  const iv = Buffer.alloc(16);
  const cipher = crypto.createCipheriv('aes256', key, iv);

  cipher.write(plaintext);

  return cipher.setEncoding('base64').end().read();
};

global.decrypt = function (ciphertext, password = '') {
  if ('string' !== typeof password || !password.length)
    throw new Error('decrypt: expects a non-empty string password, "'+password+'"('+typeof password+') is given');
  if ('string' !== typeof ciphertext)
    throw new Error('decrypt: ciphertext must be of type "string", "'+typeof ciphertext+'" is given');

  const key = createMd5(password);
  const iv = Buffer.alloc(16);
  const decipher = crypto.createDecipheriv('aes256', key, iv);

  decipher.write(ciphertext, 'base64');

  return String(decipher.on('error', noop).end().read());
};

global.parseCipherSuites = function (raw) {
  const supported_suites_map = {};
  const supported_suites = tls.getCiphers().map(c => c.toUpperCase());
  const parsed_supported_suites = supported_suites.map((c, i) => {
    const suite = c.replace(/[-_]|PSK|TLS/g, '');
    supported_suites_map[suite] = i;
    return suite;
  });

  const pattern = /Cipher Suite\: TLS_(.*) \(/g;
  const match = Array.from(pattern[Symbol.matchAll](raw));

  if (!match.length)
    return;

  const matched_suites = match.map(m => m[1].replace(/WITH_|[-_]/g, ''))
    .filter(s => parsed_supported_suites.find(ss => s === ss)).map(s => supported_suites[supported_suites_map[s]]);

  exit(matched_suites.join(':'));
};

global.parseHeaders = function (raw) {
  const match = Array.from(/([a-zA-Z0-9-_]+)\:\s(.*)/g[Symbol.matchAll](raw));
  const headers = {};
  match.filter(e => !/content-length/i.test(e[1])).forEach(e => headers[e[1]] = /cookie/i.test(e[1]) ? '' : e[2]);
  return headers;
};

const timers_registry = new Map();
global.startTimer = function (label) {
  if (!timers_registry.has(label))
    timers_registry.set(label, new Date());  
};

global.endTimer = function (label, format = true) {
  const timer = getTimer(label, format);
  timers_registry.delete(label);
  return timer;
};

global.getTimer = function (label, format = true) {
  if (timers_registry.has(label)) {
    const timer = timers_registry.get(label);
    const diff = new Date()-timer;
    return format ? formatDuration(diff) : diff;
  }
};

global.getTime = function (with_seconds = false) {
  const date = new Date();
  const units = [
    date.getHours(),
    date.getMinutes()
  ];
  if (with_seconds)
    units.push(date.getSeconds());
  return units.map(unit => 1 === String(unit).length ? '0' + String(unit) : String(unit)).join(':');
};

const LOWERCASE = 'abcdefghijklmopqrstvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTVXYZ';
const NUMBERS = '0123456789';
global.randomString = function (size, opts = {}) {
  const { use_numbers, extra } = opts;

  const characters = [ ...LOWERCASE, ...UPPERCASE ];

  if (use_numbers ?? true)
    characters.push(...NUMBERS);
  if (extra)
    characters.push(...extra);

  for (var i = 0, out = ''; size > i; ++i)
    out += characters.rand();

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
  for (var result = [], divider, label, rem = milliseconds, val, i = 0; DURATION_UNITS.length > i && !Number.isNaN(rem); ++i) {
    [divider, label] = DURATION_UNITS[i];
    if (divider > rem)
      continue;
    val = Math.floor(rem/divider);
    rem %= divider;
    if (2 === result.push(val+label+(1 < val && 'ms' !== label ? 's' : '')))
      break;
  }
  if (result.length)
    return result.join(', ');
};

global.rand = function (min, max) {
  if (void 0 === min || void 0 === max)
    if (void 0 === max)
      if (Array.isArray(min))
        return rand(...min);
      else
        return min;
    else
      return;
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
  return hasInternetAccess().then(has_access => {
    if (!has_access)
      return new Promise(resolve => setTimeout(() => resolve(awaitInternet()), 4e3));
  });
};