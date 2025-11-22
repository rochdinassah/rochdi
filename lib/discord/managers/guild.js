// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const GuildComponent = require('../components/guild');
const ChannelComponent = require('../components/channel');

class GuildManager extends EventEmitter {
  constructor(manager) {
    super();
    
    const { logger, connection_manager, api_manager } = manager;

    this.manager = manager;
    this.api_manager = api_manager;
    this.logger = logger;
    
    this.guilds = new Map();

    connection_manager.on('GUILD_CREATE', this.onGuildCreateMessage.bind(this));
    connection_manager.on('CHANNEL_CREATE', this.onChannelCreateMessage.bind(this));
    connection_manager.on('CHANNEL_UPDATE', this.onChannelUpdateMessage.bind(this));
    connection_manager.on('CHANNEL_DELETE', this.onChannelDeleteMessage.bind(this));
    connection_manager.on('MESSAGE_CREATE', this.onMessageCreateMessage.bind(this));
  }

  getGuild(guild_id) {
    const { guilds } = this;
    
    if (!/^[a-z]/i.test(guild_id))
      return guilds.get(guild_id);

    const regexp = new RegExp(guild_id, 'i');

    for (const guild of guilds.values())
      if (regexp.test(guild.name))
        return guild;
  }

  hasGuild(guild_id) {
    const { guilds } = this;

    if (!/^[a-z]/i.test(guild_id))
      return guilds.has(guild_id);

    const regexp = new RegExp(guild_id, 'i');

    for (const guild of guilds.values())
      if (regexp.test(guild.name))
        return true;

    return false;
  }

  unsetGuild(guild_id) {
    return this.guilds.delete(guild_id);
  }

  makeGuild(guild_infos) {
    const guild_id = guild_infos.id;
    const guild = new GuildComponent(this.manager, guild_infos);
    this.guilds.set(guild_id, guild);
    this.emit('GuildObjectCreated::'+guild_id);
    // this.emit('GuildObjectCreated', guild);
  }

  updateGuildInfos(guild_id, infos) {
    const guild = this.getGuild(guild_id);

    guild.name = infos.name;

    infos.channels.forEach(channel_infos => {
      if (!guild.hasChannel(channel_infos.id))
        return guild.makeChannel(channel_infos);
      guild.updateChannelInfos(channel_infos.id, channel_infos);
    });
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
    for (const channel of this.getGuild(guild_id).channels.values()) {
      await this.deleteChannel(channel.id);
      await new Promise(resolve => setTimeout(resolve, 2**10));
    }
  }

  onGuildCreateMessage(infos) {
    if (!this.hasGuild(infos.id))
      return this.makeGuild(infos);
    this.updateGuildInfos(infos.id, infos);
  }

  onChannelCreateMessage(infos) {
    this.getGuild(infos.guild_id).makeChannel(infos);
  }

  onChannelUpdateMessage(infos) {
    this.getGuild(infos.guild_id).updateChannelInfos(infos);
  }
  
  onChannelDeleteMessage(data) {
    this.getGuild(data.guild_id).unsetChannel(data.id);
  }

  onMessageCreateMessage(msg) {
    if (void 0 === msg.guild_id)
      return;

    this.getGuild(msg.guild_id).getChannel(msg.channel_id).emit('Message', msg);
    this.manager.emit('Message', msg);
  }
}

module.exports = GuildManager;