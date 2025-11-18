// author: rochdi nassah
// created: 2025/09/18

'use strict';

require('rochdi');
require('./_matchers');

const sample = 'lorem ipsum foo bar baz qux quux quuz corge grault';

test('returns a random character from self', () => {
  for (let i = 0; 32 > i; ++i) {
    expect(sample.rand()).toBeOneOf(sample.split(''));
    expect('foo'.rand()).not.toMatch(/[a-eg-np-z]/);
  }
});

test('returns shuffled string', () => {
  for (let i = 0; 32 > i; ++i) {
    expect(sample.shuffle()).not.toBe(sample);
    expect(sample.shuffle().length).toBe(sample.length);
  }
});

test('transforms first letter to uppercase', () => {
  expect('foo'.ucfirst()).toBe('Foo');
  expect('1foo'.ucfirst()).toBe('1foo');
  expect('@foo'.ucfirst()).toBe('@foo');
  expect(' foo'.ucfirst()).toBe(' foo');
});

test('transforms string to kebab-case', () => {
  expect('foo'.toKebabCase()).toBe('foo');
  expect('qu ux'.toKebabCase()).toBe('qu-ux');
  expect('f "_____"\'\'\'\'" oo.)\\((()) ?@#bar     !'.toKebabCase()).toBe('f-oo-bar');
  expect(':---::foo___bar   -::::!'.toKebabCase()).toBe('foo-bar');
});

test('comparison test', () => {
  expect('foobarbazquxquuxquuz'.cmp('fOoBARBAZQuxquuxQuuZ')).toBe(true);
  expect('128FOOBARb$@!_~-@Az1024QuxqUUxqUUZ'.cmp('128FOOBARb$@!_~-@Az1024QuxqUUxqUUZ')).toBe(true);
  expect('foobarbaz'.cmp('')).toBe(false);
  expect('foobarbaz'.cmp('foobarbaz\r')).toBe(false);
});