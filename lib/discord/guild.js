// author: rochdi nassah

'use strict';

const Role = require('./role');
const Channel = require('./channel');
const EventEmitter = require('node:events');

class Guild extends EventEmitter {
  constructor(manager, opts = {}) {
    super();

    const { properties, member_count, joined_at, id } = opts;
    const { logger } = manager;
    
    this.manager = manager;
    this.logger = logger;
    this.properties = properties;
    this.name = properties.name;
    this.member_count = member_count;
    this.joined_at = joined_at;
    this.id = id;

    this.roles = new Map();
    this.channels = new Map();

    for (const role of opts.roles) {
      if (role.id === this.id)
        continue;
      this.roles.set(role.id, new Role(this, role));
    }
    for (const channel of opts.channels) {
      this.channels.set(channel.id, new Channel(this, channel));
    }
  }

  getRoleByNameId(nameId) {
    for (const role of this.roles.values()) {
      if (new RegExp(nameId, 'i').test(role.name))
        return role;
    }
  }

  getChannelByNameId(nameId) {
    for (const channel of this.channels.values()) {
      if (new RegExp(nameId, 'i').test(channel.name))
        return channel;
    }
  }

  _createChannel(type, name, isPrivate) {
    const { id, manager, logger } = this;
    const permission_overwrites = !isPrivate ? [] : [{ id, type: 0, allow: '0', deny: '1049600' }];
    const body = { type, name, permission_overwrites };
    return manager.post('guilds/'+id+'/channels', body).then(res => {
      const { statusCode, data } = res;
      if (201 !== statusCode)
        return logger.warn('channel creation error, http(%d)', statusCode, data), false;
      return true;
    });
  }

  createTextChannel(name, isPrivate) {
    return this._createChannel(0, name, isPrivate);
  }

  createVoiceChannel(name, isPrivate) {
    return this._createChannel(2, name, isPrivate);
  }
}

module.exports = Guild;