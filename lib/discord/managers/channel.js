// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class ChannelManager extends EventEmitter {
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
    connection.on('CHANNEL_CREATE', this.onChannelCreateMessage.bind(this));
    connection.on('CHANNEL_UPDATE', this.onChannelUpdateMessage.bind(this));
    connection.on('CHANNEL_DELETE', this.onChannelDeleteMessage.bind(this));
  }

  _createChannel(guild_id, type, name, is_private) {
    const { api_manager, logger } = this;
    const permission_overwrites = !is_private ? [] : [{ id, type: 0, allow: '0', deny: '1049600' }];
    const body = { type, name, permission_overwrites };
    return api_manager.post('guilds/'+guild_id+'/channels', body).then(res => {
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
    const { logger, api_manager } = this;
    return api_manager.delete('channels/'+channel_id).then(res => {
      const { status_code, data } = res;

      if (200 !== status_code)
        return logger.warn('deleteChannel: request error, http(%d)', status_code), false;

      logger.verbose('channel "%s" deleted', data.name);
      return true;
    });
  }

  async deleteChannels(guild_id, channel_name_ids) {
    for (const channel of this.guild_manager.getGuild(guild_id).channels.values()) {
      await this.deleteChannel(channel.id);
      await new Promise(resolve => setTimeout(resolve, 2**10));
    }
  }

  onChannelCreateMessage(infos) {
    this.guild_manager.getGuild(infos.guild_id).makeChannel(infos);
  }

  onChannelUpdateMessage(infos) {
    this.guild_manager.getGuild(infos.guild_id).updateChannelInfos(infos);
  }
  
  onChannelDeleteMessage(data) {
    this.guild_manager.getGuild(data.guild_id).unsetChannel(data.id);
  }
}

module.exports = ChannelManager;