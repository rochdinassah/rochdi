// author: rochdi nassah

'use strict';

const ChannelComponent = require('./channel');
const EventEmitter = require('node:events');

class Guild extends EventEmitter {
  constructor(manager, infos) {
    super();

    const { id, channels } = infos;

    this.name = infos.properties?.name ?? infos.name;
    this.id = id;

    this.manager = manager;
    this.channels = new Map();

    channels.forEach(this.makeChannel.bind(this));
  }

  getChannelByNameId(name_id) {
    for (const channel of this.channels.values())
      if (new RegExp(name_id, 'i').test(channel.name))
        return channel;
  }

  getChannel(channel_id) {
    return this.channels.get(channel_id);
  }

  hasChannel(channel_id) {
    return this.channels.has(channel_id);
  }

  unsetChannel(channel_id) {
    return this.channels.delete(channel_id);
  }

  makeChannel(infos) {
    return this.channels.set(infos.id, new ChannelComponent(this.manager, infos));
  }

  updateChannelInfos(channel_id, infos) {
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

  createTextChannel(name, is_private) {
    return this.manager.guild_manager.createTextChannel(name, is_private);
  }

  createVoiceChannel(name, is_private) {
    return this.manager.guild_manager.createVoiceChannel(name, is_private);
  }
}

module.exports = Guild;