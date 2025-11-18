// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class InteractionService extends EventEmitter {
  constructor(main_service) {
    super();
    
    this.main_service = main_service;
  }
}

module.exports = InteractionService;