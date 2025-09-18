// author: rochdi nassah
// created: 2025/09/18

'use strict';

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