// author: rochdi nassah
// created: 2025/09/18

'use strict';

require('rochdi');
require('./_matchers');

const sample = 'lorem ipsum foo bar baz qux quux quuz corge grault';

test('transforms first letter to uppercase', () => {
  expect('foo'.ucfirst()).toBe('Foo');
  expect('1foo'.ucfirst()).toBe('1foo');
});

test('transforms string to kebab-case', () => {
  expect('foo'.toKebabCase()).toBe('foo');
  expect('foo bar'.toKebabCase()).toBe('foo-bar');
  expect('foo  "__"\'\'"  .)\\((()(()   bar?!?.?!'.toKebabCase()).toBe('foo-bar');
  expect('foo :::-   ____   bar!?'.toKebabCase()).toBe('foo-bar');
  expect('foo          bar?'.toKebabCase()).toBe('foo-bar');
  expect('foo-----_________      bar?!'.toKebabCase()).toBe('foo-bar');
  expect('-----foo___bar   -.'.toKebabCase()).toBe('foo-bar');
  expect(':---::foo___bar   -::::!'.toKebabCase()).toBe('foo-bar');
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