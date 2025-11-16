// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const ChannelComponent = require('../components/channel');

class ChannelService extends EventEmitter {
  constructor(discord) {
    super();

    const { logger, guild_service } = discord;

    this.discord = discord;
    this.logger = logger;
    this.guild_service = guild_service;

    discord.on('MESSAGE_CREATE', this.onMessageCreate.bind(this));
    discord.on('CHANNEL_CREATE', this.onChannelCreate.bind(this));
    discord.on('CHANNEL_UPDATE', this.onChannelUpdate.bind(this));
    discord.on('CHANNEL_DELETE', this.onChannelDelete.bind(this));
  }

  getChannel(guild_id, channel_id) {
    const { guild_service } = this;
    const guild = guild_service.getGuild(guild_id);
    const channel = guild.channels.get(channel_id);
    return channel;
  }

  _createChannel(guild_id, type, name, is_private) {
    const { discord, logger } = this;
    const permission_overwrites = !is_private ? [] : [{ id, type: 0, allow: '0', deny: '1049600' }];
    const body = {
      type,
      name,
      permission_overwrites
    };
    return discord.post('guilds/'+guild_id+'/channels', body).then(res => {
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
    const { discord, logger } = this;
    return discord.delete('channels/'+channel_id).then(res => {
      const { status_code, data } = res;
      if (200 !== status_code)
        return logger.warn('channelDelete: requet error, http(%d), message:', status_code, data.message), false;
      return true;
    });
  }

  sendMessage(channel_id, content) {
    const { discord, logger } = this;
    const body = {
      mobile_network_type: 'unknown',
      content,
      nonce: '',
      tts: false,
      flags: 0
    };
    return discord.post('/channels/'+channel_id+'/messages', body).then(res => {
      const { status_code, data } = res;
      if (200 !== status_code)
        return logger.warn('ChannelService.sendMessage: request error, http(%d)', status_code), false;
      return data.id;
    });
  }

  onMessageCreate(data) {
    const { guild_id, channel_id, id } = data;
    const channel = this.getChannel(guild_id, channel_id);
    channel.emit('message', data);
    this.emit('message::'+id, data);
  }

  onChannelCreate(data, is_update) {
    const { guild_id } = data;
    const guild = this.guild_service.getGuild(guild_id);
    guild.channels.set(data.id, new ChannelComponent(data));
  }

  onChannelUpdate(data, is_update = true) {
    this.onChannelCreate(data, true);
  }

  onChannelDelete(data) {
    const { guild_id } = data;
    const guild = this.guild_service.getGuild(guild_id);
    guild.channels.delete(data.id);
  }
}

module.exports = ChannelService;