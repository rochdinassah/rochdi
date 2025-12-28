// author: rochdi nassah
// created: 2025/12/28

'use strict';

const EventEmitter = require('node:events');

class StateManager extends EventEmitter {
  constructor() {
    super();

    log('ok');
  }
}

module.exports = StateManager;