// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class Role extends EventEmitter {
  constructor(guild, opts = {}) {
    super();

    const { position, permissions, name, id } = opts;
    const { manager } = guild;
    const { logger } = manager;

    this.guild = guild;
    this.manager = manager;
    this.logger = logger;
    this.position = position;
    this.permissions = permissions;
    this.name = name;
    this.id = id;
  }

  delete() {
    const { id, manager, guild, logger } = this;
    return manager.delete('guilds/'+guild.id+'/roles/'+id).then(res => {
      const { statusCode, data } = res;
      if (204 !== statusCode)
        return logger.warn('role delete error, message:', data.message ?? 'unknown error'), false;
      return true;
    });
  }
}

module.exports = Role;