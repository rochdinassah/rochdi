// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const GuildComponent = require('../components/guild');

class GuildService extends EventEmitter {
  constructor(discord) {
    super();
    
    const { logger } = discord;

    this.discord = discord;
    this.logger = logger;

    this.guilds = new Map();

    this.discord.on('GUILD_CREATE', this.onGuildCreate.bind(this));
  }

  getGuild(guild_id) {
    return this.guilds.get(guild_id);
  }

  getGuildByNameId(name_id) {
    for (const guild of this.guilds.values())
      if (new RegExp(name_id).test(guild.name))
        return guild;
  }

  onGuildCreate(infos) {
    this.guilds.set(infos.id, new GuildComponent(infos));
  }
}

module.exports = GuildService;