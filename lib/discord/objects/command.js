// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class CommandObject extends EventEmitter {
  constructor(manager, infos) {
    super();

    this.manager = manager;
  }
}

module.exports = CommandObject;