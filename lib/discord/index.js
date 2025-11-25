// author: rochdi nassah
// created: 2025/09/22

'use strict';

module.exports.API_VERSION = 10;
module.exports.snowflakeToTimestamp = function (id) {
  return Number(1420070400000n+(BigInt(id) >> 22n));
};

const EventEmitter = require('node:events');
const Http2Client = require('../http2-client');
const Logger = require('../logger');
const ApiManager = require('./managers/api');
const GuildManager = require('./managers/guild');
const ConnectionManager = require('./managers/connection');
const CommandManager = require('./managers/command');
const InteractionManager = require('./managers/interaction');
const MessageManager = require('./managers/message');
const ChannelManager = require('./managers/channel');

class Discord extends EventEmitter {
  constructor(token, opts = {}) {
    super();

    const { type, logger, presence_status } = opts;

    if (!token)
      throw new Error('Discord.constructor: "token" is required');

    this.token = token;
    this.presence_status = presence_status;
    this.user_id = atob(token.split('.')[0]);
    this.application_id = this.user_id;
    this.state = 'CLOSED';

    this.logger = logger ?? new Logger.SilentLogger();

    this.connection_manager = new ConnectionManager(this);
    this.api_manager = new ApiManager(this);
    this.guild_manager = new GuildManager(this);
    this.command_manager = new CommandManager(this);
    this.interaction_manager = new InteractionManager(this);
    this.message_manager = new MessageManager(this);
    this.channel_manager = new ChannelManager(this);

    this.startListen(this.connection_manager);
  }

  startListen(connection) {
    connection.on('RECV_INITIAL_HEARTBEAT_INTERVAL', this.authenticate.bind(this));
    connection.on('close', this.onConnectionClose.bind(this));
    connection.on('READY', this.onReadyMessage.bind(this));
    connection.on('RESUMED', this.onResumedMessage.bind(this));
  }

  async connect() {
    const { api_manager, command_manager, connection_manager } = this;

    const user = await api_manager.fetchMe();
    
    if (!user)
      return false;

    if (user.bot)
      await command_manager.fetchCommands();

    connection_manager.state = 'CONNECTING';
    connection_manager.connect('wss://gateway.discord.gg/?encoding=json&v='+exports.API_VERSION);

    return new Promise(resolve => this.once('AuthComplete', resolve));
  }

  disconnect(code = 1001) {
    return this.connection_manager.disconnect(code);
  }

  authenticate() {
    const { token, type, presence_status, connection_manager } = this;
    const { state, session_id, seq } = connection_manager;

    let payload;

    if (session_id)
      payload = { op: 6, d: { token, session_id, seq } };
    else {
      const d = require('./templates/'+('bot' === type ? 'auth-bot' : 'auth-user'));
      
      d.token = token;

      if (presence_status)
        d.presence.status = presence_status;
      if ('user' === type)
        d.properties.browser_user_agent = Http2Client.user_agent;

      payload = { op: 2, d };
    }

    connection_manager.send(payload);
  }

  getGuild(guild_id) {
    return this.guild_manager.getGuild(guild_id);
  }

  onConnectionClose(code) {
    this.ready = false;
    if (4001 === code)
      return this.emit('AuthComplete', false);
  }

  onReadyMessage(data) {
    const { connection_manager, guild_manager, command_manager, logger } = this;
    const { user, guilds } = data;

    this.username = user.username;
    this.user_email = user.email;
    this.user = user;

    const promises = [];

    for (const guild of guilds) {
      if (guild.unavailable) {
        promises.push(new Promise(resolve => guild_manager.once('GuildObjectCreated::'+guild.id, resolve)));
      } else {
        connection_manager.emit('GUILD_CREATE', guild);
      }
    }

    Promise.all(promises).then(() => {
      this.ready = true;
      logger.verbose('auth ok | %s%s', user.username, user.bot ? ', commands('+command_manager.size+')' : '');
      this.emit('AuthComplete', true);
      this.emit('Ready')
    });
  }

  onResumedMessage(data) {
    this.logger.verbose('resumed');
    this.ready = true;
    this.emit('Resumed');
  }
}

module.exports = Discord;