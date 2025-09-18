'use strict';

expect.extend({
  toBeIncluded: (val, arr) => {
    return { pass: arr.includes(val) };
  }
});