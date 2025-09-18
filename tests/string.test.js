'use strict';

// author: rochdi nassah
// created: 2025/09/18

require('rochdi');

test('string shuffle', () => {
  expect('foo'.shuffle()).not.toBe('foo');
});