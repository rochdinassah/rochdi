// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class Channel extends EventEmitter {
  constructor(guild, opts = {}) {
    super();

    const { name, id } = opts;
    const { manager } = guild;
    const { logger } = manager;

    this.guild = guild;
    this.manager = manager;
    this.logger = logger;
    this.name = name;
    this.id = id;
  }

  delete() {
    const { id, manager, guild, logger } = this;
    return manager.delete('channels/'+id).then(res => {
      const { statusCode, data } = res;
      if (200 !== statusCode)
        return logger.warn('channel delete error, message:', data.message), false;
      return true;
    });
  }

  send(content) {
    const { manager, logger } = this;
    const body = {
      mobile_network_type: 'unknown',
      content: '**'+content+'**',
      nonce: '',
      tts: false,
      flags: 0
    };
    return manager.post('/channels/'+this.id+'/messages', body).then(res => {
      const { statusCode, data } = res;
      if (200 !== statusCode)
        return logger.warn('channel.send: request error, http(%d)', statusCode);
      const { type, xcontent, timestamp, id, channel_id, author } = data;
      logger.verbose(content);
      return id;
    });
  }
}

module.exports = Channel;