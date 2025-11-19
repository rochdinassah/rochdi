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

String.prototype.toBase2 = function () {
  return String(1n);
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
Number.prototype.toBase2 = String.prototype.toBase2;
// ::number