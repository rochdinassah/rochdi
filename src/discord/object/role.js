// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class RoleObject extends EventEmitter {
  constructor(manager, guild_id, infos) {
    super();

    const { version, position, permissions, name, mentionable, managed, id, hoist, flags } = infos;

    this.guild_id = guild_id;
    this.version = version;
    this.position = position;
    this.permissions = permissions;
    this.name = name;
    this.mentionable = mentionable;
    this.managed = managed;
    this.id = id;
    this.hoist = hoist;
    this.flags = flags;

    this.manager = manager;
  }

  delete() {
    return this.manager.role_manager.deleteRole(this.guild_id, this.id);
  }
}

module.exports = RoleObject;