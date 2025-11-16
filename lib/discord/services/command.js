// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class CommandService extends EventEmitter {
  constructor(discord) {
    super();
    
    this.discord = discord;
  }
}

module.exports = CommandService;