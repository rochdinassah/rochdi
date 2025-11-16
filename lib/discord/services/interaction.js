// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class InteractionService extends EventEmitter {
  constructor(discord) {
    super();
    
    this.discord = discord;
  }
}

module.exports = InteractionService;