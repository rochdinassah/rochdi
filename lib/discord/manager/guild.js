// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const GuildObject = require('../object/guild');

class GuildManager extends EventEmitter {
  constructor(manager) {
    super();
    
    const { logger, connection_manager, api_manager } = manager;

    this.manager = manager;
    this.api_manager = api_manager;
    this.logger = logger;

    this.guilds = new Map();

    this.startListen(connection_manager);
  }

  startListen(connection) {
    connection.on('GUILD_CREATE', this.onGuildCreateMessage.bind(this));
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
    const guild = new GuildObject(this.manager, guild_infos);
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

  onGuildCreateMessage(infos) {
    if (!this.hasGuild(infos.id))
      return this.makeGuild(infos);
    this.updateGuildInfos(infos.id, infos);
  }
}

module.exports = GuildManager;