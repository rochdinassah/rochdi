'use strict';

expect.extend({
  toBeOneOf: (val, arr) => {
    return { pass: arr.includes(val) };
  }
});