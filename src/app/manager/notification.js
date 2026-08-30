// author: rochdi nassah

'use strict';

const levels = {
  error: 0xE60B0B,
  warn: 0xD0F002,
  info: 0x02F00E,
  verbose: 0x0289F0
};

const default_level = 0x0289F0;

const REACTION_IDS = {
  ok: '%E2%9C%85',
  error: '%E2%9D%8C',
  note: '%F0%9F%93%9D',
  wave: '%F0%9F%91%8B'
};

class NotificationManager {
  constructor(app) {
    const { logger, discord } = app;

    this.app = app;
    this.logger = logger;
    this.discord = discord;

    this.notification_triggering_count_map = new Map();
  }

  connect() {
    const { discord } = this;
    discord.on('Ready', this.onDiscordReady.bind(this));
    discord.on('Resumed', this.onDiscordResumed.bind(this));
    discord.connect();
  }
  
  notify(channel_id, content, opts = {}) {
    const { logger, discord, app, guild_id, last_command_infos } = this;
    const { guild } = discord;
    const { level, bold, table, mention } = opts;
    
    let channel;
    if (discord.ready) {
      channel = guild.getChannel(channel_id);

      if (!channel)
        exit('CHANNEL_NOT_FOUND');
    }
    
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

    if (last_command_infos && last_command_infos.mentionable) {
      last_command_infos.mentionable = false;
      message_opts.message_reference = {
        guild_id,
        channel_id,
        message_id: last_command_infos.message_id
      };
    }

    if (level || table) {
      const fields = [];

      if (table) {
        Object.keys(table).forEach(key => {
          if (void 0 !== table[key]) {
            fields.push({
              name: key,
              value: table[key],
              inline: false
            });
          }
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

  triggerNotification(channel_id, content, opts = {}) {
    const { app, notification_triggering_count_map } = this;
    const { timer_manager } = app;
    const { urgent } = opts;

    if (urgent)
      return this.notify(channel_id, content, { level: 'verbose', ...opts }), Promise.resolve();

    notification_triggering_count_map.set(content, 1+(notification_triggering_count_map.get(content) ?? 0));

    timer_manager.setTimeout('NotificationTriggering::'+content, () => {
      opts.table = {
        triggering_count: notification_triggering_count_map.pull(content),
        ...opts.table,
      };
      this.notify(channel_id, content, opts);
    }, 2**12);

    return Promise.resolve();
  }

  react(reaction_id, opts = {}) {
    const { discord, last_command_infos } = this;
    const { api_manager } = discord;

    if (last_command_infos && last_command_infos.reactable) {
      last_command_infos.reactable = false;
      opts.channel_id = last_command_infos.channel_id;
      opts.message_id = last_command_infos.message_id;
    }

    const { channel_id, message_id } = opts;

    if (void 0 === channel_id || void 0 === message_id)
      return Promise.resolve(false);

    return api_manager.put('/channels/'+channel_id+'/messages/'+message_id+'/reactions/'+REACTION_IDS[reaction_id]+'/%40me');
  }

  async onDiscordReady() {
    const { discord, app } = this;
    const { guild_id } = app;

    const guild = discord.getGuild(guild_id);

    if (!guild)
      exit('NotificationManager.onDiscordReady: "%s" guild missing', guild_id);

    discord.guild = guild;
    guild.on('Message', this.onDiscordMessage.bind(this));
    
    app.emit('NotificationReady');
  }

  onDiscordResumed() {
    this.notifyVerbose('discord session resumed');
  }

  onDiscordMessage(msg) {
    const { app, discord } = this;
    const { command_manager } = app;
    const { guild } = discord;
    const { author, content, channel_id, guild_id, id } = msg;
    
    if (discord.user.id === author.id || author.bot)
      return;

    const match = Array.from(/([a-z0-9.+_-]+)/ig[Symbol.matchAll](content));

    if (!match.length)
      return;

    const cmd = match[0].shift();
    const args = match.map(m => m[1]).filter(v => v);

    const opts = {
      cmd,
      args,
      channel_id: channel_id
    };

    this.last_command_infos = void 0;

    app.emitCommand(opts).then(cb => {
      if (cb) {
        this.last_command_infos = {
          reactable: true,
          mentionable: true,
          channel_id,
          message_id: id,
        };
        cb();
      } else if (channel_id === app.channel_id && !/http(s?)\:\/\//i.test(content)) {
//         try {
//           const ctime = Date.now();
//           app.openai.sendMessage(format('qickly normalize the given command if it was misspelled "%s" \
// and return the word only because i will parse it directly into my app, some event name examples: "%s"', cmd, command_manager.eventNames()))
//           .then(reply => {
//             if (cmd !== reply.content && 2**13 > new Date()-ctime) {
//               app.emitCommand({ ...opts, cmd: reply.content }).then(cb => {
//                 if (cb) {
//                   this.last_command_infos = {
//                     reactable: true,
//                     mentionable: true,
//                     channel_id,
//                     message_id: id,
//                   };
//                   cb();
//                 }
//               });
//             }
//           });
//         } catch {}
      }
    });
  }
}

module.exports = NotificationManager;