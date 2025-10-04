// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class Channel extends EventEmitter {
  constructor(guild, opts = {}) {
    super();

    this.guild = guild;
    this.manager = guild.manager;
    this.name = opts.name;
    this.id = opts.id;
  }

  delete() {
    const { id, manager, guild } = this;
    const { channels } = guild;
    return manager.delete('channels/'+id).then(res => {
      const { statusCode, data } = res;
      if (200 !== statusCode)
        return log('channel delete error, message:', data.message), false;
      return log('channel delete ok, curr size:', channels.size), true;
    });
  }

  send(content) {
    exit(content);
  }
}

module.exports = Channel;