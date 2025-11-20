// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class Channel extends EventEmitter {
  constructor(manager, infos) {
    super();

    const { type, position, permission_overwrites, parent_id, name, last_message_id, id, flags } = infos;
    
    this.type = type;
    this.position = position;
    this.permission_overwrites = permission_overwrites;
    this.parent_id = parent_id;
    this.name = name;
    this.last_message_id = last_message_id;
    this.id = id;
    this.flags = flags;

    this.manager = manager;
  }

  delete() {
    return this.manager.guild_manager.deleteChannel(this.id);
  }

  createMessage(content, embeds) {
    return this.manager.createMessage(this.id, content, embeds);
  }

  deleteMessage(message_id) {
    return this.manager.deleteMessage(this.id, message_id);
  }
}

module.exports = Channel;