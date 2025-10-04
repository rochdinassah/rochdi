// author: rochdi nassah

'use strict';

class Role {
  constructor(guild, opts = {}) {
    this.guild = guild;
    this.manager = guild.manager;
    this.position = opts.position;
    this.permissions = opts.permissions;
    this.name = opts.name;
    this.id = opts.id;
  }

  delete() {
    const { id, manager, guild } = this;
    return manager.delete('guilds/'+guild.id+'/roles/'+id).then(res => {
      const { statusCode, data } = res;
      if (204 !== statusCode)
        return log('role delete error, message:', data.message ?? 'unknown error'), false;
      return log('role delete ok'), true;
    });
  }
}

module.exports = Role;