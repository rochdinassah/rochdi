// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const GuildComponent = require('../components/guild');
const ChannelComponent = require('../components/channel');

class GuildManager extends EventEmitter {
  constructor(manager) {
    super();
    
    const { logger, connection_manager } = manager;

    this.manager = manager;
    this.logger = logger;

    this.guilds = new Map();

    manager.on('GUILD_CREATE', this.onGuildCreate.bind(this));
    manager.on('CHANNEL_CREATE', this.onChannelCreate.bind(this));
    manager.on('CHANNEL_UPDATE', this.onChannelUpdate.bind(this));
    manager.on('CHANNEL_DELETE', this.onChannelDelete.bind(this));
    manager.on('MESSAGE_CREATE', this.onMessageCreate.bind(this));
  }

  getGuildByNameId(name_id) {
    for (const guild of this.guilds.values())
      if (new RegExp(name_id).test(guild.name))
        return guild;
  }

  getGuild(guild_id) {
    return this.guilds.get(guild_id);
  }

  hasGuild(guild_id) {
    return this.guilds.has(guild_id);
  }

  unsetGuild(guild_id) {
    return this.guilds.delete(guild_id);
  }

  makeGuild(guild_infos) {
    return this.guilds.set(guild_infos.id, new GuildComponent(this.manager, guild_infos));
  }

  updateGuildInfos(guild_id, infos) {
    const guild = this.getGuild(guild_id);

    guild.name = infos.name;

    infos.channels.forEach(channel_infos => {
      if (!guild.hasChannel(channel_infos.id))
        return guild.makeChannel(channel_infos);
      guild.updateChannel(channel_infos.id, channel_infos);
    });
  }

  _createChannel(guild_id, type, name, is_private) {
    const { manager, logger } = this;
    const permission_overwrites = !is_private ? [] : [{ id, type: 0, allow: '0', deny: '1049600' }];
    const body = { type, name, permission_overwrites };
    return manager.request_manager.post('guilds/'+guild_id+'/channels', body).then(res => {
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

  onGuildCreate(infos) {
    if (!this.hasGuild(infos.id))
      return this.makeGuild(infos);
    this.updateGuildInfos(infos.id, infos);
  }

  onChannelCreate(infos) {
    this.getGuild(infos.guild_id).makeChannel(infos);
  }

  onChannelUpdate(infos) {
    this.getGuild(infos.guild_id).updateChannelInfos(infos);
  }

  onChannelDelete(data) {
    this.getGuild(data.guild_id).unsetChannel(data.id);
  }

  onMessageCreate(msg) {
    this.getGuild(msg.guild_id).getChannel(msg.channel_id).emit('message', msg);
  }
}

module.exports = GuildManager;