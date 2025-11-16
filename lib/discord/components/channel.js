// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class Channel extends EventEmitter {
  constructor(infos) {
    super();

    const { name, id } = infos;
    
    this.name = name;
    this.id = id;
  }
}

module.exports = Channel;