// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class InteractionManager extends EventEmitter {
  constructor(manager) {
    super();

    const { logger, api_manager, command_manager } = manager;

    this.manager = manager;
    this.logger = logger;
    this.api_manager = api_manager;
    this.command_manager = command_manager;

    manager.on('INTERACTION_CREATE', this.onInteractionCreate.bind(this));
  }

  respondInteraction(opts = {}) {
    const { logger, api_manager } = this;
    const { id, token, data } = opts;
    return api_manager.post(format('interactions/%s/%s/callback', id, token), { type: 4, data });
  }

  onInteractionCreate(infos) {
    const { logger, commands, manager } = this.command_manager;
    const { type, token, member, id, guild_id, data, channel_id } = infos;

    const user = member ? member.user : infos.user;
    const username = user.global_name ?? user.username;
    const command = commands.get(data.id);

    manager.emit('interaction::'+command.name, { type, token, id, user });
  }
}

module.exports = InteractionManager;