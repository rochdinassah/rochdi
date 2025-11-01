// author: rochdi nassah
// created: 2025/11/1

'use strict';

const EventEmitter = require('node:events');

class Openai extends EventEmitter {
  constructor() {
    super();
  }
}

module.exports = Openai;