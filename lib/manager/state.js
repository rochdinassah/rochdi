// author: rochdi nassah
// created: 2025/12/28

'use strict';

const EventEmitter = require('node:events');

class StateManager extends EventEmitter {
  constructor() {
    super();

    this.acquired = false;
    this.locked = false;

    this.acq_queue = [];
    this.lock_queue = [];
  }

  acquire() {
    if (!this.acquired)
      return this.acquired = true, Promise.resolve();
    return new Promise(resolve => this.acq_queue.push(resolve));
  }

  release() {
    this.acquired = false;
    if (this.acq_queue)
      this.acq_queue.shift()();
  }

  lock() {
    this.locked = true;
  }

  unlock() {
    this.locked = false;
  }
}

module.exports = StateManager;