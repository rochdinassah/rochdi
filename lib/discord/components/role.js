// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class Role extends EventEmitter {
  constructor(guild, opts = {}) {
    super();

    const { position, permissions, name, id } = opts;
    const { discord } = guild;
    const { logger } = discord;

    this.guild = guild;
    this.discord = discord;
    this.logger = logger;
    this.position = position;
    this.permissions = permissions;
    this.name = name;
    this.id = id;
  }

  delete() {
    const { id, discord, guild, logger } = this;
    return discord.delete('guilds/'+guild.id+'/roles/'+id).then(res => {
      const { status_code, data } = res;
      if (204 !== status_code)
        return logger.warn('Role.delete: request error, http(%d), message(%s)', status_code, data.message ?? 'unknown error'), false;
      return true;
    });
  }
}

module.exports = Role;