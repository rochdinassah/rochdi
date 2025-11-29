// author: rochdi nassah

'use strict';

require('./_matcher');
require('rochdi');

const encpass = 'f-o+O!@b$A#r/10%2*4!_';
test('returns md5 hash', () => {
  expect(createMd5(encpass)).toBe('0d00405a3643f420784bb7e28b1e6efd');
});
test('encryption flow', () => {
  const plaintext = randomString(1e3);
  const ciphertext = encrypt(plaintext, encpass);
  
  expect(ciphertext).not.toBe(plaintext);

  expect(decrypt(ciphertext, ' ')).not.toBe(plaintext);

  function withEmptyPassword() {
    decrypt(ciphertext, '');
  }
  function withNoPassword() {
    decrypt(ciphertext);
  }

  expect(withEmptyPassword).toThrow();
  expect(withNoPassword).toThrow();

  expect(decrypt(ciphertext, encpass+'a')).not.toBe(plaintext);
  expect(decrypt(ciphertext, encpass)).toBe(plaintext);
});

test('returns formatted duration', () => {
  expect(formatDuration(2)).toBe('2ms');
  expect(formatDuration('4')).toBe('4ms');
  expect(formatDuration('4.9')).toBe('4ms');
  expect(formatDuration('4.3')).toBe('4ms');
  expect(formatDuration(1e3)).toBe('1 second');
  expect(formatDuration(2e3)).toBe('2 seconds');
  expect(formatDuration(16+2e3)).toBe('2 seconds, 16ms');
  expect(formatDuration(24*(6e4*60))).toBe('1 day');
  expect(formatDuration(2*24*(6e4*60))).toBe('2 days');
  expect(formatDuration(32*6e4+2*24*(6e4*60))).toBe('2 days, 32 minutes');
  expect(formatDuration(1*6e4+2*24*(6e4*60))).toBe('2 days, 1 minute');
  expect(formatDuration(1*6e4+128*24*(6e4*60))).toBe('128 days, 1 minute');
});

test('returns random string', () => {
  const size = 128;
  expect(randomString(size).length).toBe(size);
  expect(randomString(size)).toMatch(/^[a-z0-9]+$/i);
  expect(randomString(size, { use_numbers: false })).not.toMatch(/\d/i);
  expect(randomString(size, { use_numbers: false })).not.toMatch(/[.*\\/.]/i);
  expect(randomString(size, { use_numbers: false, extra: '.*\\/.' })).toMatch(/[.*\\/.]/i);
});