// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class ChannelManager extends EventEmitter {
  constructor(manager) {
    super();

    const { logger, connection_manager, guild_manager, api_manager } = manager;

    this.manager = manager;
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
    connection.on('VOICE_STATE_UPDATE', this.onVoiceStateUpdateMessage.bind(this));
    connection.on('VOICE_SERVER_UPDATE', this.onVoiceServerUpdateMessage.bind(this));
  }
  
  _createChannel(guild_id, type, name, is_private) {
    const { api_manager, logger } = this;

    const guild = this.manager.getGuild(guild_id);

    const permission_overwrites = !is_private ? [] : [{ id, type: 0, allow: '0', deny: '1049600' }];
    const body = { type, name, permission_overwrites };
    return api_manager.post('guilds/'+guild.id+'/channels', body).then(res => {
      const { status_code, data } = res;
      if (201 !== status_code)
        return logger.warn('channel creation error, http(%d)', status_code, data), false;
      return guild.getChannel(data.id) || new Promise(resolve => guild.once('ChannelMake::'+data.id, resolve));
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

  joinChannel(guild_id, channel_id, opts = {}) {
    return new Promise(resolve => {
      const { connection_manager } = this;

      const self_mute = opts.self_mute ?? true;
      const self_deaf = opts.self_deaf ?? false;
      const self_video = opts.self_video ?? false;

      connection_manager.send({ op: 4, d: {
        guild_id,
        channel_id,
        self_mute,
        self_deaf
      }});

      this.once('VoiceStateUpdate', () => resolve());
    });
  }

  quitChannel(guild_id) {
    return new Promise(resolve => {
      const { connection_manager } = this;
      connection_manager.send({ op: 4, d: {
        guild_id,
        channel_id: null,
        self_mute: true,
        self_deaf: false
      }});
      this.once('VoiceStateUpdate', () => resolve());      
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

  onVoiceStateUpdateMessage(data) {
    this.emit('VoiceStateUpdate', data);
  }

  onVoiceServerUpdateMessage(data) {
    this.emit('VoiceServerUpdate', data);
  }

  startTyping(channel_id) {
    return this.api_manager.post('/channels/'+channel_id+'/typing');
  }
}

module.exports = ChannelManager;