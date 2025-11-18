// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const ChannelComponent = require('../components/channel');

class ChannelService extends EventEmitter {
  constructor(main_service) {
    super();

    const { logger, guild_service } = main_service;

    this.main_service = main_service;
    this.logger = logger;
    this.guild_service = guild_service;

    main_service.on('MESSAGE_CREATE', this.onMessageCreate.bind(this));
    main_service.on('CHANNEL_CREATE', this.onChannelCreate.bind(this));
    main_service.on('CHANNEL_UPDATE', this.onChannelUpdate.bind(this));
    main_service.on('CHANNEL_DELETE', this.onChannelDelete.bind(this));
  }

  _createChannel(guild_id, type, name, is_private) {
    const { main_service, logger } = this;
    const permission_overwrites = !is_private ? [] : [{ id, type: 0, allow: '0', deny: '1049600' }];
    const body = {
      type,
      name,
      permission_overwrites
    };
    return main_service.request_service.post('guilds/'+guild_id+'/channels', body).then(res => {
      const { status_code, data } = res;
      if (201 !== status_code)
        return logger.warn('channel creation error, http(%d)', status_code, data), false;
      return true;
    });
  }

  createTextChannel(guild_id, name, is_private) {
    return this._createChannel(guild_id, 0, name, is_private);
  }

  createVoiceChannel(guild_id, name, is_private) {
    return this._createChannel(guild_id, 2, name, is_private);
  }

  deleteChannel(channel_id) {
    const { main_service, logger } = this;
    return main_service.request_service.delete('channels/'+channel_id).then(res => {
      const { status_code, data } = res;
      if (200 !== status_code)
        return logger.warn('channelDelete: requet error, http(%d), message:', status_code, data.message), false;
      return true;
    });
  }

  sendMessage(channel_id, content) {
    const { main_service, logger } = this;
    const body = {
      mobile_network_type: 'unknown',
      content,
      nonce: '',
      tts: false,
      flags: 0
    };
    return main_service.request_service.post('/channels/'+channel_id+'/messages', body).then(res => {
      const { status_code, data } = res;
      if (200 !== status_code)
        return logger.warn('ChannelService.sendMessage: request error, http(%d)', status_code), false;
      return data.id;
    });
  }

  onMessageCreate(data) {
    this.main_service.guild_service
      .getGuild(data.guild_id)
      .getChannel(data.channel_id)
      .emit('message', data);
    this.emit('message::'+data.id, data);
  }

  onChannelCreate(data) {
    this.guild_service.getGuild(data.guild_id).makeChannel(data);
  }

  onChannelUpdate(data) {
    this.guild_service
      .getGuild(data.guild_id)
      .updateChannel(data.id, data);
  }

  onChannelDelete(data) {
    this.guild_service.getGuild(data.guild_id).unsetChannel(data.id);
  }
}

module.exports = ChannelService;