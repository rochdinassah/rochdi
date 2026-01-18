// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const MessageObject = require('../object/message');

class MessageManager extends EventEmitter {
  constructor(manager) {
    super();

    const { logger, connection_manager, guild_manager, api_manager } = manager;

    this.manager = this;
    this.connection_manager = connection_manager;
    this.guild_manager = guild_manager;
    this.api_manager = api_manager;
    this.logger = logger;

    this.startListen(connection_manager);
  }

  startListen(connection) {
    connection.on('MESSAGE_CREATE', this.onMessageCreateMessage.bind(this));
  }

  sendMessage(channel_id, content, opts = {}) {
    const { logger, api_manager } = this;

    const payload = { content, tts: false, ...opts };

    return api_manager.post('/channels/'+channel_id+'/messages', payload).then(res => {
      const { status_code, data } = res;
      if (200 !== status_code)
        return logger.warn('sendMessage: request error, http(%d)', status_code, data), false;
      return true;
    });
  }

  deleteMessage(channel_id, message_id) {
    const { logger, api_manager } = this;
    return api_manager.delete('channels/'+channel_id+'/messages/'+message_id).then(res => {
      const { status_code, data } = res;
      if (204 !== status_code)
        return logger.warn('deleteMessage: request error, http(%d)', status_code), false;
      logger.verbose('message delete ok');
      return true;
    });
  }

  onMessageCreateMessage(infos) {
    if (0 !== infos.channel_type)
      return;

    const { manager, guild_manager } = this;
    const { guild_id, channel_id } = infos;
    
    const message = new MessageObject(manager, infos);

    const guild = guild_manager.getGuild(guild_id);
    const channel = guild.getChannel(channel_id);
    
    channel.emit('Message', message);
  }
}

module.exports = MessageManager;