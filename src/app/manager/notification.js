// author: rochdi nassah

'use strict';

const levels = {
  error: 0xE60B0B,
  warn: 0xD0F002,
  info: 0x02F00E,
  verbose: 0x0289F0
};

const default_level = 0x0289F0;

class NotificationManager {
  constructor(app) {
    const { logger, discord } = app;

    this.app = app;
    this.logger = logger;
    this.discord = discord;
  }

  connect() {
    const { discord } = this;
    discord.on('Ready', this.onDiscordReady.bind(this));
    discord.on('Resumed', this.onDiscordResumed.bind(this));
    discord.connect();
  }
  
  notify(content, opts = {}) {
    const { logger, discord } = this;
    const { level, bold, table, mention } = opts;

    const channel = opts.channel ?? discord.channel;

    if ((!String(content).length || void 0 === content) && !table)
      return Promise.resolve(false);
    
    const content_present = String(content).length && String(void 0) !== String(content) || String(void 0) === content;
    if (!content_present && table)
      log(table);
    else if (content_present && !table)
      logger.verbose(content);
    else if (content_present && table)
      log(content+':', table);

    if (!discord || !discord.ready || !channel)
      return Promise.resolve(false);

    if (bold || table || level)
      content = format('%s**%s**', table ? '### ' : '', content);

    const message_opts = {
      embeds: []
    };

    if (level || table) {
      const fields = [];

      if (table) {
        Object.keys(table).forEach(key => {
          fields.push({
            name: key,
            value: table[key],
            inline: false
          });
        });
      }

      const { embeds } = message_opts;
      embeds.push({
        type: 'rich',
        description: content,
        color: levels[level] ?? default_level,
        fields
      });
      content = '';
    }

    if (mention)
      content = mention.map(user_id => '<@'+user_id+'>').join('\n')+content;

    return channel.sendMessage(content, message_opts);
  }

  triggerNotification(content, opts = {}) {
    const { app } = this;
    const { timer_manager } = app;
    timer_manager.setTimeout('NotificationTriggering::'+content, this.notify.bind(this, content, opts), 2**14);
    return Promise.resolve();
  }

  async onDiscordReady() {
    const { discord, app } = this;
    const { notification_channel } = app;

    const guild = discord.getGuild('console');

    if (!guild)
      exit('NotificationManager.onDiscordReady: "console" guild missing');

    if (!guild.hasChannel(notification_channel))
      await guild.createTextChannel(notification_channel);
    
    const channel = guild.getChannel(notification_channel);
    channel.on('Message', this.onDiscordMessage.bind(this));
    discord.channel = channel;
    app.emit('NotificationReady');
  }

  onDiscordResumed() {
    this.notifyVerbose('discord session resumed');
  }

  onDiscordMessage(msg) {
    const { app, discord } = this;
    const { command_manager } = app;
    const { author, content, channel_id, guild_id } = msg;
    
    if (discord.user.id === author.id)
      return;

    const match = Array.from(/([a-z0-9.+_-]+)/ig[Symbol.matchAll](content));

    if (!match.length)
      return;

    const cmd = match[0].shift().toLowerCase();
    const args = match.map(m => m[1]).filter(v => v);
    
    if (command_manager.eventNames().includes(cmd))
      discord.api_manager.post(format('/channels/%s/typing', channel_id)).then(() => command_manager.emit(cmd, ...args));
  }
}

module.exports = NotificationManager;