// author: rochdi nassah

'use strict';

const levels = {
  error: 0xE60B0B,
  info: 0x02F00E,
  warn: 0xD0F002,
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

  notify(content, opts = {}) {
    const { logger, discord } = this;
    const { level, bold, skip_log, table, mention } = opts;
    const { channel } = discord;

    if (!discord || !discord.ready || !channel)
      return Promise.resolve(false);

    if (!skip_log)
      logger.verbose(content);

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
}

module.exports = NotificationManager;