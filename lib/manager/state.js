// author: rochdi nassah
// created: 2025/12/28

'use strict';

const EventEmitter = require('node:events');

class StateManager extends EventEmitter {
  constructor(opts = {}) {
    super();

    const { states } = opts;

    this.acquired = false;

    this.states = new Map();

    this.acq_queue = [];

    this.initStates(states);
  }

  initStates(initial_states) {
    const states = new Map();

    states.set('Locked', false);

    initial_states = {
      'Foo': false,
      'Bar': false,
      'Baz': 0,
      'Qux': 0
    };

    for (const key in initial_states)
      states.set(key, initial_states[key]);
  }

  acquire(label = 'default') {
    if (!this.acquired)
      return this.acquired = label || true, Promise.resolve();
    return new Promise(resolve => this.acq_queue.push(resolve));
  }

  release() {
    this.acquired = false;
    if (this.acq_queue)
      this.acq_queue.shift()();
  }

  lock() {
    return this.updateState('Locked', true);
  }

  unlock() {
    return this.updateState('Locked', false);
  }

  updateState(state, value) {
    // this.states.set()
    // this.states.get(s)
  }
}

module.exports = StateManager;