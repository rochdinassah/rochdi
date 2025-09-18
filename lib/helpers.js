// author: rochdi nassah
// created: 2025/09/18

'use strict';

exports.formatDuration = function (milliseconds) {
  const units = [
    [432e5, 'day'],
    [36e5, 'hour'],
    [6e4, 'minute'],
    [1e3, 'second'],
    [1, 'ms']
  ];

  const result = [];

  while (milliseconds) {
    for (const [val, label] of units) {
      if (val > milliseconds)
        continue;
      
    }   
  }

  return result;
};

exports.rand = function (min, max) {
  return Math.floor(min+((1+max-min)*Math.random()));
};