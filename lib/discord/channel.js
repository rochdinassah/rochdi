// author: rochdi nassah

'use strict';

class Channel {
  constructor(guild, opts = {}) {
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
}

module.exports = Channel;