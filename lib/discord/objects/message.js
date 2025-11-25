// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class MessageObject extends EventEmitter {
  constructor(manager, infos) {
    super();

    this.manager = manager;
  }
}

module.exports = MessageObject;