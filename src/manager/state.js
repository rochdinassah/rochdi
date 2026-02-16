// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class StateManager extends EventEmitter {
  constructor(opts = {}) {
    super();

    const { states } = opts;

    this.acquired = false;
    this.acq_queue = [];

    this.initStates(states);
  }

  initStates(initial_states) {
    const states = this.states = new Map();

    states.set('Locked', false);

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
    if (this.acq_queue.length)
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

  hasState(state_name_id) {
    return this.states.has(state_name_id);
  }

  removeState(state_name_id) {
    return this.states.delete(state_name_id);
  }

  updateState(state_name_id, value) {
    if (this.states.update(state_name_id, value))
      this.emit('StateChange');
    return this;
  }

  incrementState(state_name_id, by = 1) {
    this.updateState(state_name_id, by+this.states.get(state_name_id));
    return this;
  }

  decrementState(state_name_id, by = 1) {
    this.updateState(state_name_id, -by+this.states.get(state_name_id));
    return this;
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
      this.on('StateChange', function listener() {
        if (this.checkStateSafety(state_name_ids))
          resolve(void this.off('StateChange', listener));
      });
    });
  }
}

module.exports = StateManager;