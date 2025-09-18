'use strict';

require('./_matchers');

const rochdi = require('rochdi');

const { randomString } = rochdi;

test('returns random string', () => {
  const size = 4096;
  expect(randomString(size).length).toBe(size);
  expect(randomString(size)).toMatch(/^[a-z0-9]+$/i);
  expect(randomString(size, { useNumbers: false })).not.toMatch(/\d/i);
  expect(randomString(size, { useNumbers: false })).not.toMatch(/[.*\\/.]/i);
  expect(randomString(size, { useNumbers: false, extra: '.*\\/.' })).toMatch(/[.*\\/.]/i);
});