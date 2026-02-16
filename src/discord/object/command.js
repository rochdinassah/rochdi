// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class CommandObject extends EventEmitter {
  constructor(manager, infos) {
    super();

    const { id, type, name, description, dm_permission } = infos;
    
    this.id = id;
    this.type = type;
    this.name = name;
    this.description = description;
    this.dm_permission = dm_permission;

    this.manager = manager;
  }
}

module.exports = CommandObject;