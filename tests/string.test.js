// author: rochdi nassah
// created: 2025/09/18

'use strict';

require('rochdi');
require('./_matchers');

const sample = 'lorem ipsum foo bar baz qux quux quuz corge grault';

test('returns a random character from self', () => {
  expect(sample.rand()).toBeIncluded(sample.split(''));
});

test('returns shuffled string', () => {
  expect(sample.shuffle()).not.toBe(sample);
});