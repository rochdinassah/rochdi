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
  for (let i = 0, randomIndex, size = this.length; size > i; ++i) {
    randomIndex = parseInt(size*Math.random());
    [this[i], this[randomIndex]] = [this[randomIndex], this[i]];
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
    if (cc !== cc2 && (cc > cc2 && (cc-cc2 !== 32)) || (cc < cc2 && (cc2-cc !== 32))) {
      return false;
    }
  }
  return true;
};

String.prototype.padLeft = function (padding) {
  if (this.startsWith(padding))
    return this;
  const firstChar = this[0];
  const paddingChars = padding.split('');
  for (const char of paddingChars) {
    if (char === firstChar) {
      return this.replace(new RegExp(`${firstChar}.+${paddingChars.at(-1)}`), padding);
    }
  }
  return padding+this;
};

String.prototype.padRight = function (padding) {
  if (this.endsWith(padding))
    return this;
  const lastChar = this.at(-1);
  const paddingChars = padding.split('');
  for (const char of paddingChars) {
    if (char === lastChar) {
      return this.replace(new RegExp(`${paddingChars[0]}.+${lastChar}`), padding);
    }
  }
  return this+padding;
};

String.prototype.toBase64Url = function () {
  return this.toBase64().replace(/\=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

String.prototype.toBase64 = function () {
  return btoa(this);
};

String.prototype.rand = function () {
  return this[parseInt(this.length*Math.random())];
};

String.prototype.shuffle = function () {
  return this.split('').shuffle().join('');
};

String.prototype.toKebabCase = function () {
  return this.toLowerCase().replace(/(_|\s)/g, '-');
};

String.prototype.ucfirst = function () {
  return this.replace(/^([a-z])/, (m, a) => a.toUpperCase());
};
// ::string