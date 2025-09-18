// author: rochdi nassah
// created: 2025/09/18

'use strict';

const DURATION_UNITS = [
  [432e5, ' day'],
  [36e5, ' hour'],
  [6e4, ' minute'],
  [1e3, ' second'],
  [1, 'ms']
];

exports.formatDuration = function (milliseconds) {
  const result = [];
  let labelCount;
  while (milliseconds) {
    for (const [val, label] of DURATION_UNITS) {
      if (val > milliseconds)
        continue;
      labelCount = Math.floor(milliseconds/val);
      milliseconds -= val*labelCount;
      result.push(labelCount+label+(1 < labelCount && 'ms' !== label ? 's' : ''));
    }
  }
  return result;
};

exports.rand = function (min, max) {
  return Math.floor(min+((1+max-min)*Math.random()));
};