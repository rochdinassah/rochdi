// author: rochdi nassah

'use strict';

const ChannelObject = require('./channel');
const EventEmitter = require('node:events');

class GuildObject extends EventEmitter {
  constructor(manager, infos) {
    super();

    const { id, channels, roles } = infos;

    this.name = infos.properties?.name ?? infos.name;
    this.id = id;

    this.manager = manager;
    this.channels = new Map();
    this.roles = roles;

    channels.forEach(this.makeChannel.bind(this));
  }

  getChannelByNameId(name_id) {
    for (const channel of this.channels.values())
      if (new RegExp(name_id, 'i').test(channel.name))
        return channel;
  }

  getChannel(channel_id) {
    if (!/[a-z]/i.test(channel_id))
      return this.channels.get(channel_id);

    const pattern = new RegExp(channel_id, 'i');

    for (const channel of this.channels.values())
      if (pattern.test(channel.name))
        return channel;
  }

  hasChannel(channel_id) {
    if (!/[a-z]/i.test(channel_id))
      return this.channels.has(channel_id);

    const pattern = new RegExp(channel_id, 'i');

    for (const channel of this.channels.values())
      if (pattern.test(channel.name))
        return true;

    return false;
  }

  unsetChannel(channel_id) {
    return this.channels.delete(channel_id);
  }

  makeChannel(infos) {
    return this.channels.set(infos.id, new ChannelObject(this.manager, infos));
  }

  updateChannelInfos(infos) {
    const { id, type, position, permission_overwrites, parent_id, name, last_message_id, flags } = infos;

    const channel = this.getChannel(id);

    channel.type = type;
    channel.position = position;
    channel.permission_overwrites = permission_overwrites;
    channel.parent_id = parent_id;
    channel.name = name;
    channel.last_message_id = last_message_id;
    channel.flags = flags;
  }

  createTextChannel(name, is_private) {
    return this.manager.guild_manager.createTextChannel(this.id, name, is_private);
  }

  createVoiceChannel(name, is_private) {
    return this.manager.guild_manager.createVoiceChannel(this.id, name, is_private);
  }

  deleteChannels(channel_name_ids) {
    return this.manager.guild_manager.deleteChannels(this.id, channel_name_ids);
  }

  clearMessages() {
    return this.manager.guild_manager.clearMessages(this.id);
  }
}

module.exports = GuildObject;