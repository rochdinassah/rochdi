// author: rochdi nassah
// created: 2025/09/18

'use strict';

exports.rand = function (min, max) {
  return Math.floor(min+((1+max-min)*Math.random()));
};