// author: rochdi nassah

'use strict';

const GuildComponent = require('../components/guild');

class GuildService {
  constructor(discord) {
    const { logger } = discord;

    this.discord = discord;
    this.logger = logger;

    this.guilds = new Map();

    this.discord.on('GUILD_CREATE', this.onGuildCreate.bind(this));
  }

  onGuildCreate(data) {
    this.guilds.set(data.id, new GuildComponent(this.discord, data));
  }

  getGuild(id) {
    return this.guilds.get(id);
  }

  getGuildByname_id(name_id) {
    for (const guild of this.guilds.values())
      if (new RegExp(name_id).test(guild.name))
        return guild;
  }
}

module.exports = GuildService;