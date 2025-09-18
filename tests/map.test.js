'use strict';

// author: rochdi nassah
// created: 2025/09/18

require('rochdi');

test('Map.prototype.remember test', () => {
  const map = new Map();

  map.set('foo', 1);

  expect(map.get('foo')).toBe(1);
  
  map.remember('foo', 2, 64);

  expect(map.has('foo')).toBe(true);
  expect(map.get('foo', 2));

  setTimeout(() => {
    expect(map.has('foo')).toBe(true);
    expect(map.get('foo')).toBe(2);

    setTimeout(() => {
      expect(map.has('foo')).toBe(false);
      expect(map.get('foo')).toBe(void 0);
    }, 128);
  }, 32);

  map.remember('bar', 'ok');
  
  Promise.resolve(() => {
    expect(map.has('bar')).toBe(false);
  });

  map.remember('baz', 'ok', 128);

  setTimeout(() => {
    map.set('baz', 'ok');

    expect(map.get('baz')).toBe('ok');

    setTimeout(() => {
      expect(map.get('baz')).toBe('ok');
    }, 256);
  }, 64);
});