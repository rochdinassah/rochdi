// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class Channel extends EventEmitter {
  constructor(guild, opts = {}) {
    super();

    const { name, id } = opts;
    const { discord } = guild;
    const { logger } = discord;

    this.guild = guild;
    this.discord = discord;
    this.logger = logger;
    this.name = name;
    this.id = id;
  }

  delete() {
    const { id, discord, guild, logger } = this;
    return discord.delete('channels/'+id).then(res => {
      const { status_code, data } = res;
      if (200 !== status_code)
        return logger.warn('channel delete error, message:', data.message), false;
      return true;
    });
  }

  send(content) {
    const { discord, logger } = this;
    const body = {
      mobile_network_type: 'unknown',
      content,
      nonce: '',
      tts: false,
      flags: 0
    };
    return discord.post('/channels/'+this.id+'/messages', body).then(res => {
      const { status_code, data } = res;
      if (200 !== status_code)
        return logger.warn('channel.send: request error, http(%d)', status_code);
      const { type, content, timestamp, id, channel_id, author } = data;
      return id;
    });
  }
}

module.exports = Channel;