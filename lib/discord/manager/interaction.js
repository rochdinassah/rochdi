// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const InteractionObject = require('../object/interaction');

class InteractionManager extends EventEmitter {
  constructor(manager) {
    super();
    
    const { logger, api_manager, connection_manager, command_manager } = manager;

    this.manager = manager;
    this.logger = logger;
    this.api_manager = api_manager;
    this.connection_manager = connection_manager;
    this.command_manager = command_manager;

    connection_manager.on('INTERACTION_CREATE', this.onInteractionCreateMessage.bind(this));
  }

  respondInteraction(opts = {}) {
    const { logger, api_manager } = this;
    const { id, token, data } = opts;
    const body = {
      type: 4,
      data
    };
    return api_manager.post('/interactions/'+id+'/'+token+'/callback', body);
  }

  onInteractionCreateMessage(infos) {
    const { logger, commands, manager } = this.command_manager;
    const { type, token, member, id, guild_id, data, channel_id } = infos;

    const user = member ? member.user : infos.user;
    const username = user.global_name ?? user.username;
    const command = commands.get(data.id);
    
    const interaction = new InteractionObject(manager, infos);

    this.emit('Interaction::'+command.name, interaction);
    this.emit('Interaction', interaction);
  }
}

module.exports = InteractionManager;