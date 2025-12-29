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
    const states = this.states = new Map();

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

  getState(state_name_id) {
    return this.states.get(state_name_id);
  }

  updateState(state_name_id, value) {
    if (this.states.update(state_name_id, value))
      this.emit('StateChange');
  }

  incrementState(state_name_id, by) {
    this.updateState(state_name_id, by+this.states.get(state_name_id))
  }

  decrementState(state_name_id, by) {
    this.updateState(state_name_id, -by+this.states.get(state_name_id))
  }

  checkStateSafety(state_name_ids = []) {
    for (const state_name_id of state_name_ids)
      if (this.getState(state_name_id))
        return false;
    return true;
  }

  awaitSafeState(state_name_ids = []) {
    if (this.checkStateSafety(state_name_ids))
      return Promise.resolve();
    return new Promise(resolve => {
      const listener = function () {
        if (this.checkStateSafety(state_name_ids)) {
          this.removeListener('StateChange', listener);
          resolve();
        }
      }
      this.on('StateChange', listener);
    });
  }
}

module.exports = StateManager;