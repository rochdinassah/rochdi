// author: rochdi nassah

'use strict';

const ChannelComponent = require('./channel');
const EventEmitter = require('node:events');

class Guild extends EventEmitter {
  constructor(infos) {
    super();

    const { id, channels } = infos;

    this._channels = new Map();
    this.name = infos.properties?.name ?? infos.name;
    this.id = id;

    channels.forEach(this.makeChannel.bind(this));
  }

  getChannelByNameId(name_id) {
    for (const channel of this._channels.values())
      if (new RegExp(name_id, 'i').test(channel.name))
        return channel;
  }

  getChannel(channel_id) {
    return this._channels.get(channel_id);
  }

  hasChannel(channel_id) {
    return this._channels.has(channel_id);
  }

  unsetChannel(channel_id) {
    return this._channels.delete(channel_id);
  }

  makeChannel(infos) {
    return this._channels.set(infos.id, new ChannelComponent(infos));
  }

  updateChannel(channel_id, infos) {
    const channel = this.getChannel(channel_id);
    const { type, position, permission_overwrites, parent_id, name, last_message_id, flags } = infos;
    channel.type = type;
    channel.position = position;
    channel.permission_overwrites = permission_overwrites;
    channel.parent_id = parent_id;
    channel.name = name;
    channel.last_message_id = last_message_id;
    channel.flags = flags;
  }
}

module.exports = Guild;