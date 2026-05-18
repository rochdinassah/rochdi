// author: rochdi nassah

'use strict';

function timeout_cb(label, cb, args) {
  this.delete(label);
  cb(...args);
}

class TimerManager {
  constructor() {
    this.map = new Map();
  }

  setTimeout(label, cb, ms, ...args) {
    return this._create(label, setTimeout(timeout_cb.bind(this.map, label, cb, args), ms));
  }

  setInterval(label, cb, ms, ...args) {
    return this._create(label, setInterval(cb, ms, ...args));
  }

  cancel(label) {
    return clearTimeout(this.map.pull(label));
  }

  has(label) {
    return this.map.has(label);
  }

  _create(label, timeout_obj) {
    this.cancel(label);
    this.map.set(label, timeout_obj.unref());
  }

  close() {
    const { map } = this;
    map.forEach(clearTimeout);
    map.clear();
  }
}

module.exports = TimerManager;