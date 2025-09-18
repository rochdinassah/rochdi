'use strict';

require('rochdi');

test('pulls the value from the map', () => {
  const map = new Map();

  map.set('foo', 'ok');

  expect(map.get('foo')).toBe('ok');
  expect(map.pull('foo')).toBe('ok');
  expect(map.has('foo')).toBe(false);
  expect(map.get('foo')).toBe(void 0);
});