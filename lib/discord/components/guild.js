// author: rochdi nassah

'use strict';

const ChannelComponent = require('./channel');
const EventEmitter = require('node:events');

class Guild extends EventEmitter {
  constructor(infos) {
    super();

    const { properties, member_count, joined_at, id, channels } = infos;

    this.properties = properties;
    this.name = properties?.name ?? infos.name;
    this.member_count = member_count;
    this.joined_at = joined_at;
    this.id = id;

    this.channels = new Map();

    for (const channel_infos of channels)
      this.channels.set(channel_infos.id, new ChannelComponent(channel_infos));
  }

  getChannelByNameId(name_id) {
    for (const channel of this.channels.values())
      if (new RegExp(name_id, 'i').test(channel.name))
        return channel;
  }
}

module.exports = Guild;