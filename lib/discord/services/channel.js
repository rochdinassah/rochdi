// author: rochdi nassah

'use strict';

class ChannelService {
  constructor(discord) {
    this.discord = discord;

    discord.on('MESSAGE_CREATE', this.onMessageCreate.bind(this));
  }

  onMessageCreate(data) {

  }
}

module.exports = ChannelService;