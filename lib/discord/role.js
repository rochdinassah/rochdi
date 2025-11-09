// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class Role extends EventEmitter {
  constructor(guild, opts = {}) {
    super();

    const { position, permissions, name, id } = opts;
    const { handler } = guild;
    const { logger } = handler;

    this.guild = guild;
    this.handler = handler;
    this.logger = logger;
    this.position = position;
    this.permissions = permissions;
    this.name = name;
    this.id = id;
  }

  delete() {
    const { id, handler, guild, logger } = this;
    return handler.delete('guilds/'+guild.id+'/roles/'+id).then(res => {
      const { status_code, data } = res;
      if (204 !== status_code)
        return logger.warn('role delete error, message:', data.message ?? 'unknown error'), false;
      return true;
    });
  }
}

module.exports = Role;