// author: rochdi nassah
// created: 2025/09/18

'use strict';

// ::map
Map.prototype.pull = function (key) {
  const val = this.get(key);
  return this.delete(key), val;
};
// ::map

// ::array
Array.prototype.toBase10 = function () {
  for (let i = 0, bit; this.length > i; ++i) {
    try {
      bit = BigInt(this[i]);
      if (![0n, 1n].includes(bit))
        throw void 0;
      this[i] = bit;
    } catch {
      return [];
    }
  }
  return String(this.reduce((p, c) => c+2n*p)).split('');
};
Array.prototype.rand = function () {
  return this[parseInt(this.length*Math.random())];
};

Array.prototype.shuffle = function () {
  for (let i = 0, random_index, size = this.length; size > i; ++i) {
    random_index = parseInt(size*Math.random());
    [this[i], this[random_index]] = [this[random_index], this[i]];
  }
  return this;
};
// ::array

// ::string
String.prototype.cmp = function (str) {
  if (this.length !== str.length)
    return false;
  if (this === str)
    return true;
  for (let i = 0, cc, cc2; str.length > i; ++i) {
    cc = this.charCodeAt(i);
    cc2 = str.charCodeAt(i);
    if (cc !== cc2 && (cc > cc2 && (cc-cc2 !== 32)) || (cc < cc2 && (cc2-cc !== 32)))
      return false;
  }
  return true;
};

String.prototype.padLeft = function (padding, max_length) {
  if (this.startsWith(padding) || max_length <= this.length)
    return this;
  const first_char = this[0];
  const padding_chars = padding.split('');
  for (const char of padding_chars)
    if (char === padding_chars)
      return this.replace(new RegExp(`${first_char}.+${padding_chars.at(-1)}`), padding);
  return (padding+this).substr(0, max_length);
};

String.prototype.padRight = function (padding, max_length) {
  if (this.endsWith(padding) || max_length <= this.length)
    return this;
  const last_char = this.at(-1);
  const padding_chars = padding.split('');
  for (const char of padding_chars)
    if (char === last_char)
      return this.replace(new RegExp(`${padding_chars[0]}.+${last_char}`), padding);
  return (this+padding).substr(0, max_length);
};

String.prototype.toBase64Url = function () {
  return this.toBase64().replace(/\=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

String.prototype.toBase64 = function () {
  return btoa(this);
};

String.prototype.toBase10 = function () {
  return this.split('').toBase10().join('');
};

String.prototype.toBase2 = function () {
  let dec;

  try {
    dec = BigInt(this);
  } catch {
    return;
  }

  if (0n === dec)
    return '0';

  if (0n > dec)
    dec *= -1n;

  const rems = [];

  do {
    rems.push(dec%2n);
    dec /= 2n;
  } while (0n < dec);

  return rems.reverse().join('');
};

String.prototype.toSignedBase2 = function () {
  const sign = 0n > BigInt(this) ? 1n : 0n;
  const unsigned = this.toBase2().split('').map(bit => 1^bit);
  const signed = (BigInt(Array.from(unsigned).toBase10().join(''))+sign).toBase2().split('');
  const space = new Int8Array(1+unsigned.length);
  space[0] = Number(sign);
  signed.reverse().forEach((bit, i) => space[(space.length-1)-i] = bit);
  return space.join('');
};

String.prototype.rand = function () {
  return this[parseInt(this.length*Math.random())];
};

String.prototype.shuffle = function () {
  return this.split('').shuffle().join('');
};

String.prototype.toKebabCase = function () {
  return this.toLowerCase()
    .replace(/[^a-z0-9\s_+-]/g, '')
    .replace(/[\s\_]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[^a-z0-9]|[^a-z0-9]$/g, '');
};

String.prototype.ucfirst = function () {
  return this.replace(/^[a-z]/, m => m.toUpperCase());
};
// ::string

// ::number
Number.prototype.toBase2 = BigInt.prototype.toBase2 = String.prototype.toBase2;
Number.prototype.toSignedBase2 = BigInt.prototype.toSignedBase2 = String.prototype.toSignedBase2;
// ::number