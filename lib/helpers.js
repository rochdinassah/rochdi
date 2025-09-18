// author: rochdi nassah
// created: 2025/09/18

'use strict';

const http2 = require('node:http2');

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

  exit(characters);
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