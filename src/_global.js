// author: rochdi nassah

'use strict';

const http2 = require('node:http2');
const crypto = require('node:crypto');
const tls = require('node:tls');
const util = require('node:util');
const child_process = require('node:child_process');
const net = require('node:net');
const os = require('node:os');
const fs = require('node:fs');

const { exec, execSync } = child_process;
const { writeFileSync, appendFileSync, readFileSync, existsSync, unlinkSync, mkdirSync } = fs;
const { readdirSync } = fs;

global.stringify = JSON.stringify;
global.parse = JSON.parse;

global.exec = child_process.exec;
global.execSync = child_process.execSync;
global.writeFileSync = writeFileSync;
global.appendFileSync = appendFileSync;
global.readFileSync = readFileSync;
global.readdirSync = readdirSync;
global.existsSync = existsSync;
global.unlinkSync = unlinkSync;
global.mkdirSync = mkdirSync;

global.keys = Object.keys;
global.values = Object.values;
global.entries = Object.entries;

global.min = Math.min;
global.max = Math.max;
global.round = Math.round;
global.floor = Math.floor;
global.ceil = Math.ceil;

global.getMachineId = function () {
  if (!existsSync('/etc/machine-id'))
    return 'DEFAULT_MACHINE_ID';
  return String(readFileSync('/etc/machine-id')).trim();
};
 
global.saveJson = function (path, object) {
  writeFileSync(path, JSON.stringify(object, null, 2), { flag: 'w+' });
};

global.awaitPortOpen = function (port, addr = '127.0.0.1') {
  return new Promise(resolve => {
    function connect() {
      const socket = new net.Socket();
      socket.on('error', () => asyncDelay(2**10).then(connect));
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.connect(port, addr);
    }
    asyncDelay(2**9).then(connect);
  });
};

global.getType = function (val) {
  return 'object' !== typeof val ? typeof val : null === val ? 'null' : Array.isArray(val) ? 'array' : 'object';
};

global.siren = function (name_id = 'warn', volume) {
  const curr_volume = /Volume: front-left:\s{1,}\d{1,} \/\s{1,}(\d{1,}%)/.exec(execSync('pactl get-sink-volume 0'))[1];

  if (volume && !Number.isNaN(parseInt(volume)))
    execSync('pactl set-sink-volume 0 '+parseInt(volume)+'%');

  return new Promise(resolve => exec('play /opt/lumino/bin/'+name_id+'.mp3', () => {
    execSync('pactl set-sink-volume 0 '+curr_volume);
    resolve();
  }));
};

global.probabilityCallback = function (percentage, callback, ...args) {
  if (parseFloat(percentage) >= 0.0000000000000001+(100*Math.random()))
    callback(...args);
};

const TIMEOUT_MAX_VAL = 2**32/2-1;

global.asyncDelay = function (ms) {
  if (Array.isArray(ms))
    ms = rand(ms[0], ms[1]);
  if ('number' !== typeof ms || 1 > ms)
    return Promise.resolve();
  return new Promise(resolve => setTimeout(resolve, Math.min(ms, TIMEOUT_MAX_VAL)));
};

let fn = new Intl.NumberFormat().format;
global.formatNumber = function (number) {
  if (1e6 > number)
    return fn(number);
  if (1e9 <= number)
    return [Math.floor(number/1e9), Math.floor(number%1e9/1e6)].filter(n => n).join(',')+'B';
  if (1e6 <= number)
    return [Math.floor(number/1e6), Math.floor(number%1e6/1e5)].filter(n => n).join(',')+'M';
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

global.parseHeaders = function (raw) {
  const match_arr = Array.from(/([a-zA-Z0-9-_]+)\:\s(.*)/g[Symbol.matchAll](raw));
  const headers = {};
  const marker = randomString(16);
  for (const [noop, key, val] of match_arr) {
    if (/content-length/i.test(key))
      continue;
    headers[marker+key+marker] = marker+(/cookie/i.test(key) ? '' : val)+marker;
  }
  exit(JSON.stringify(headers, null, 2).replaceAll('"'+marker, '\'').replaceAll(marker+'"', '\''));
};

const timer_map = new Map();
global.startTimer = function (label) {
  if (!timer_map.has(label))
    timer_map.set(label, new Date());  
};

global.endTimer = function (label, format = true) {
  const timer = getTimer(label, format);
  timer_map.delete(label);
  return timer;
};

global.getTimer = function (label, format = true) {
  const timer = timer_map.get(label) ?? new Date();
  const diff = new Date()-timer;
  return format ? formatDuration(diff) : diff;
};

global.hasTimer = function (label) {
  return timer_map.has(label);
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

  const characters = [...LOWERCASE, ...UPPERCASE];

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

  if (!milliseconds)
    return '0ms';

  for (var result = [], divider, label, rem = milliseconds, val, i = 0; DURATION_UNITS.length > i && !Number.isNaN(rem); ++i) {
    [divider, label] = DURATION_UNITS[i];
    if (divider > rem)
      continue;
    val = Math.floor(rem/divider);
    rem %= divider;
    if (2 === result.push(val+label+(0 < val && 'ms' !== label ? 's' : '')))
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

global.checkInternet = function () {
  return new Promise(resolve => {
    http2.connect('https://google.com')
      .on('error', () => resolve(false))
      .on('connect', function () {
        this.destroy();
        resolve(true);
      });
  });
};

global.awaitInternet = function () {
  return checkInternet().then(ok => {
    if (!ok)
      return new Promise(resolve => setTimeout(() => resolve(awaitInternet()), 4e3));
  });
};

global.getIp = function () {
  return new Promise(resolve => {
    function cb(err, ip) {
      resolve(err ? false : ip);
    }
    const http2_client = new(require('./http-client'))({ retry_on_error: true });
    return http2_client.get('https://checkip.amazonaws.com').then(res => {
      const { status_code, data } = res;
      if (200 !== status_code)
        return false;
      http2_client.close();
      cb(null, data.replace(/[\s\n]/g, ''));
    }).catch(cb);
  });
};

global.awaitIpChange = function (curr_ip, timeout) {
  return new Promise(async resolve => {
    let ip = curr_ip;
    let aborted, timeout_id;

    if (timeout)
      timeout_id = setTimeout(() => aborted = true, timeout);
    
    while (ip === curr_ip && !aborted)
      ip = await getIp().then(ip => asyncDelay(2**10).then(() => ip));
    
    resolve(ip === curr_ip ? awaitInternet().then(Boolean) : ip);
  });
};

// PROCESS EXIT START
const exit_cb = [];
const signals = ['INT', 'HUP', 'TERM', 'QUIT', 'USR1', 'USR2'];

signals.forEach(sig => process.on('SIG'+sig, onProcessExit));

global.onExit = exit_cb.push.bind(exit_cb);

const exitProcess = process.exit;
process.exit = code => {
  if (1001 === code)
    exitProcess(0);
  else
    exitProcess(code);
}

async function onProcessExit(signal, code) {
  for (const cb of exit_cb)
    await cb();
  this.exit(code);
}
// PROCESS EXIT END