// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const GuildComponent = require('../components/guild');
const ChannelComponent = require('../components/channel');

class GuildService extends EventEmitter {
  constructor(main_service) {
    super();
    
    const { logger } = main_service;

    this.main_service = main_service;
    this.logger = logger;

    this._guilds = new Map();

    this.main_service.on('GUILD_CREATE', this.onGuildCreate.bind(this));
  }

  getGuildByNameId(name_id) {
    for (const guild of this._guilds.values())
      if (new RegExp(name_id).test(guild.name))
        return guild;
  }

  getGuild(guild_id) {
    return this._guilds.get(guild_id);
  }

  hasGuild(guild_id) {
    return this._guilds.has(guild_id);
  }

  unsetGuild(guild_id) {
    return this._guilds.delete(guild_id);
  }

  makeGuild(guild_infos) {
    return this._guilds.set(guild_infos.id, new GuildComponent(guild_infos));
  }

  updateGuild(guild_id, infos) {
    const guild = this.getGuild(guild_id);

    guild.name = infos.name;

    infos.channels.forEach(channel_infos => {
      if (!guild.hasChannel(channel_infos.id))
        return guild.makeChannel(channel_infos);
      guild.updateChannel(channel_infos.id, channel_infos);
    });
  }

  onGuildCreate(infos) {
    if (!this.hasGuild(infos.id))
      return this.makeGuild(infos);
    this.updateGuild(infos.id, infos);
  }
}

module.exports = GuildService;