// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class InteractionObject extends EventEmitter {
  constructor(manager, infos) {
    super();

    const { type, token, user, member, id, guild_id, data, context, channel_id } = infos;
    
    this.id = type;
    this.token = token;
    this.user = user;
    this.member = member;
    this.id = id;
    this.guild_id = guild_id;
    this.data = data;
    this.context = context;
    this.channel_id = channel_id;

    this.manager = manager;
  }

  respond(content) {
    return this.manager.interaction_manager.respondInteraction({ id: this.id, token: this.token, data: { content }});
  }
}

module.exports = InteractionObject;