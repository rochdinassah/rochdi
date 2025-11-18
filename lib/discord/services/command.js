// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class CommandService extends EventEmitter {
  constructor(main_service) {
    super();
    
    this.main_service = main_service;
  }
}

module.exports = CommandService;