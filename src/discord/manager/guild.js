// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const GuildObject = require('../object/guild');

class GuildManager extends EventEmitter {
  constructor(manager) {
    super();
    
    const { logger, connection_manager, api_manager } = manager;

    this.manager = manager;
    this.api_manager = api_manager;
    this.logger = logger;

    this.guilds = new Map();

    this.startListen(connection_manager);
  }

  startListen(connection) {
    connection.on('GUILD_CREATE', this.onGuildCreateMessage.bind(this));
  }
  
  getGuild(guild_id) {
    const { guilds } = this;
    
    if (!/^[a-z]/i.test(guild_id))
      return guilds.get(guild_id);
    
    const regexp = new RegExp(guild_id, 'i');

    for (const guild of guilds.values())
      if (regexp.test(guild.name))
        return guild;
  }

  hasGuild(guild_id) {
    const { guilds } = this;

    if (!/^[a-z]/i.test(guild_id))
      return guilds.has(guild_id);

    const regexp = new RegExp(guild_id, 'i');

    for (const guild of guilds.values())
      if (regexp.test(guild.name))
        return true;

    return false;
  }

  unsetGuild(guild_id) {
    return this.guilds.delete(guild_id);
  }

  makeGuild(guild_infos) {
    const guild_id = guild_infos.id;
    const guild = new GuildObject(this.manager, guild_infos);
    this.guilds.set(guild_id, guild);
    this.emit('GuildObjectCreated::'+guild_id);
    // this.emit('GuildObjectCreated', guild);
  }

  updateGuildInfos(guild_id, infos) {
    const guild = this.getGuild(guild_id);

    guild.name = infos.name;
    
    infos.channels.forEach(channel_infos => {
      if (!guild.hasChannel(channel_infos.id))
        return guild.makeChannel(channel_infos);
      guild.updateChannelInfos(channel_infos.id, channel_infos);
    });
  }

  _fetchMessages(guild_id, search = '', offset = 0) {
    const endpoint = '/guilds/'+guild_id+'/messages/search?'+search+'&sort_by=timestamp&sort_order=asc&offset='+offset;
    return this.api_manager.get(endpoint).then(res => {
      const { status_code, data } = res;

      if (200 !== status_code)
        return;
      
      const { messages } = data;

      if (!messages.length)
        return false;

      return messages;
    });
  }

  async fetchMessages(guild_id, search = '') {
    const messages = [];

    let fetched_messages, offset = 0;

    while (fetched_messages = await this._fetchMessages(guild_id, search, offset)) {
      offset += 25;
      messages.push(...fetched_messages.map(m => new Object({ id: m[0].id, channel_id: m[0].channel_id })));
    }

    log('Discord::GuildManager::fetchMessages: fetched size(%d)', messages.length);

    return messages;
  }

  async clearMessages(guild_id, search = '') {
    const { api_manager, manager } = this;
    const { message_manager } = manager;

    const messages = await this.fetchMessages(guild_id, search);
    
    for (const msg of messages) {
      await message_manager.deleteMessage(msg.channel_id, msg.id);
      await asyncDelay(rand(2**10, 2**11));
    }

    return asyncDelay(2**14).then(() => this.clearMessages(guild_id, search));
  }

  onGuildCreateMessage(infos) {
    if (!this.hasGuild(infos.id))
      return this.makeGuild(infos);
    this.updateGuildInfos(infos.id, infos);
  }
}

module.exports = GuildManager;