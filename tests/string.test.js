// author: rochdi nassah
// created: 2025/09/18

'use strict';

require('rochdi');
require('./_matchers');

const sample = 'lorem ipsum foo bar baz qux quux quuz corge grault';

test('transforms string to kebab-case', () => {
  expect('foo'.toKebabCase()).toBe('foo');
  expect('foo bar'.toKebabCase()).toBe('foo-bar');
  expect('foo       bar'.toKebabCase()).toBe('foo-bar');
  expect('foo    ____   bar'.toKebabCase()).toBe('foo-bar');
  expect('fo\'o    quu:x ::q::----uuz ::: bar ba"""""""z qu"x""\'"___   '.toKebabCase()).toBe('foo-quux-q-uuz-bar-baz-qux');
});

test('comparison test', () => {
  expect('foo'.cmp('foo')).toBe(true);
  expect('bar'.cmp('BAR')).toBe(true);
  expect('baz'.cmp('BaZ')).toBe(true);
  expect('bAz'.cmp('BaZ')).toBe(true);
  expect('foo'.cmp('f1o')).toBe(false);
  expect('bar'.cmp('Bxr')).toBe(false);
});

test('returns a random character from self', () => {
  expect(sample.rand()).toBeOneOf(sample.split(''));
});

test('returns shuffled string', () => {
  expect(sample.shuffle()).not.toBe(sample);
  expect(sample.shuffle().length).toBe(sample.length);
});