// author: rochdi nassah

'use strict';

class TimerManager {
  constructor() {
    this.map = new Map();
  }

  setTimeout(label, cb, ms) {
    return this._create(label, setTimeout(cb, ms));
  }

  setInterval(label, cb, ms) {
    return this._create(label, setInterval(cb, ms));
  }

  cancel(label) {
    return clearTimeout(this.map.pull(label));
  }

  _create(label, timeout_obj) {
    this.cancel(label);
    this.map.set(label, timeout_obj.unref());
  }

  clear() {
    const { map } = this;
    map.forEach(clearTimeout);
    map.clear();
  }
}

module.exports = TimerManager;