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
    const { channels } = this;
    const channel = new ChannelObject(this.manager, this.id, infos);
    channels.set(infos.id, channel);
    this.emit('ChannelMake::'+infos.id, channel);
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
    return this.manager.channel_manager.createTextChannel(this.id, name, is_private);
  }

  createVoiceChannel(name, is_private) {
    return this.manager.channel_manager.createVoiceChannel(this.id, name, is_private);
  }

  deleteChannel(channel_id) {
    const channel = this.getChannel(channel_id);
    if (!channel)
      return Promise.resolve(false);
    return this.manager.channel_manager.deleteChannel(channel.id);
  }

  deleteChannels(channel_name_ids) {
    return this.manager.channel_manager.deleteChannels(this.id, channel_name_ids);
  }

  clearMessages() {
    return this.manager.guild_manager.clearMessages(this.id);
  }

  quickBan(user_id, opts = {}) {
    return this.manager.member_manager.quickBan(this.id, user_id, opts);
  }

  muteMember(user_id, reason) {
    return this.manager.member_manager.muteMember(this.id, user_id, reason);
  }

  unmuteMember(user_id, reason) {
    return this.manager.member_manager.unmuteMember(this.id, user_id, reason);
  }

  deafMember(user_id, reason) {
    return this.manager.member_manager.deafMember(this.id, user_id, reason);
  }

  undeafMember(user_id, reason) {
    return this.manager.member_manager.undeafMember(this.id, user_id, reason);
  }

  muteAndDeafMember(user_id, reason) {
    return this.manager.member_manager.muteAndDeafMember(this.id, user_id, reason);
  }

  unmuteAndUndeafMember(user_id, reason) {
    return this.manager.member_manager.unmuteAndUndeafMember(this.id, user_id, reason);
  }

  timeoutMember(user_id, reason) {
    return this.manager.member_manager.timeoutMember(this.id, user_id, reason);
  }

  removeMemberTimeout(user_id, reason) {
    return this.manager.member_manager.removeMemberTimeout(this.id, user_id, reason);
  }

  banMember(user_id, reason, delete_messages = false) {
    return this.manager.member_manager.banMember(this.id, user_id, reason, delete_messages);
  }

  unbanMember(user_id, reason) {
    return this.manager.member_manager.unbanMember(this.id, user_id, reason);
  }

  kickMember(user_id, reason) {
    return this.manager.member_manager.kickMember(this.id, user_id, reason);
  }
}

module.exports = GuildObject;