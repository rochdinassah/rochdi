// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class MessageObject extends EventEmitter {
  constructor(manager, infos) {
    super();

    const { timestamp, member, id, content, channel_type, channel_id, author, attachments, guild_id } = infos;
    
    this.timestamp = timestamp;
    this.member = member;
    this.id = id;
    this.content = content;
    this.channel_type = channel_type;
    this.channel_id = channel_id;
    this.author = author;
    this.attachments = attachments;
    this.guild_id = guild_id;

    this.manager = manager;
  }

  delete() {
    return this.manager.message_manager.deleteMessage(this.channel_id, this.id);
  }
}

module.exports = MessageObject;