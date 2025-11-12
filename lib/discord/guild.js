// author: rochdi nassah

'use strict';

const Role = require('./role');
const Channel = require('./channel');
const EventEmitter = require('node:events');

class Guild extends EventEmitter {
  constructor(handler, opts = {}) {
    super();

    const { properties, member_count, joined_at, id } = opts;
    const { logger } = handler;
    
    this.handler = handler;
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

    for (const channel of opts.channels)
      this.channels.set(channel.id, new Channel(this, channel));
  }

  getRoleByNameId(nameId) {
    for (const role of this.roles.values())
      if (new RegExp(nameId, 'i').test(role.name))
        return role;
  }

  getChannelByNameId(nameId) {
    for (const channel of this.channels.values())
      if (new RegExp(nameId, 'i').test(channel.name))
        return channel;
  }

  _createChannel(type, name, is_private) {
    const { id, handler, logger } = this;
    const permission_overwrites = !is_private ? [] : [{ id, type: 0, allow: '0', deny: '1049600' }];
    const body = { type, name, permission_overwrites };
    return handler.post('guilds/'+id+'/channels', body).then(res => {
      const { status_code, data } = res;
      if (201 !== status_code)
        return logger.warn('channel creation error, http(%d)', status_code, data), false;
      return true;
    });
  }

  createTextChannel(name, is_private) {
    return this._createChannel(0, name, is_private);
  }

  createVoiceChannel(name, is_private) {
    return this._createChannel(2, name, is_private);
  }

  createRole(name) {
    const { id, handler, logger } = this;
    const body = {
      name: name,
      color: 0,
      colors: {
        primary_color: 0,
        secondary_color: null,
        tertiary_color: null
      },
      permissions: 0
    };
    return handler.post('guilds/'+id+'/roles', body).then(res => {
      const { status_code, data } = res;
      if (200 !== status_code)
        return logger.warn('createRole: request error, http(%d)', status_code), false;
      return true;
    });
  }
}

module.exports = Guild;