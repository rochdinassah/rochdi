// author: rochdi nassah
// created: 2025/09/22

'use strict';

module.exports = Discord;
module.exports.API_VERSION = 10;
module.exports.snowflakeToTimestamp = snowflakeToTimestamp;

const WebSocket = require('ws');
const EventEmitter = require('node:events');
const Http2Client = require('../http2-client');
const Logger = require('../logger');
const { format } = require('node:util');
const ApiManager = require('./managers/request');
const GuildManager = require('./managers/guild');
const ConnectionManager = require('./managers/connection');
const CommandManager = require('./managers/command');
const InteractionManager = require('./managers/interaction');

WebSocket.prototype.write = function () {
  arguments[0] = JSON.stringify(arguments[0]);
  this.send(...arguments);
};

const DISCORD_EPOCH_TS = 1420070400000n;
function snowflakeToTimestamp(id) {
  return Number(DISCORD_EPOCH_TS+(BigInt(id) >> 22n));
}

Discord.prototype = new EventEmitter();

function Discord(token, opts = {}) {
  const { type, logger } = opts;

  if (!token)
    throw new Error('Discord.constructor: "token" is required');

  this.token = token;
  this.user_id = atob(token.split('.')[0]);
  this.application_id = this.user_id;
  this.state = 'CLOSED';

  this.logger = logger ?? new Logger.SilentLogger();

  this.connection_manager = new ConnectionManager(this);
  this.api_manager = new ApiManager(this);
  this.guild_manager = new GuildManager(this);
  this.command_manager = new CommandManager(this);
  this.interaction_manager = new InteractionManager(this);

  this.on('op::9', this.onInvalidSession);
  this.on('op::10', this.onHeartbeatInterval);
  this.on('op::11', this.onHeartbeatAck);
  this.on('op::1', this.onHeartbeatRequest);

  this.on('READY', this.onReady);
  this.on('READY_SUPPLEMENTARY', exit);
  this.on('RESUMED', this.onResumed);
}

Discord.prototype.connect = function () {
  this.state = 'CONNECTING';

  return new Promise(resolve => {
    this.api_manager.fetchMe().then(async () => {
      await this.command_manager.fetchCommands();

      const { api_manager, type } = this;

      // api_manager.get('gateway'+('bot' === type ? '/bot' : '')).then(res => {
      //   const { status_code, data } = res;

      //   if (200 !== status_code)
      //     throw new Error('gateway fetch request error, http('+status_code+')');

      //   const { url } = data;

        const url = 'wss://gateway.discord.gg';
        const addr = url+'/?encoding=json&v='+Discord.API_VERSION;

        this.once('authComplete', resolve);
        this.connection = new WebSocket(addr)
          .on('error', this.onconnectionerror.bind(this))
          .on('close', this.onconnectionclose.bind(this))
          .on('open', this.onconnectionopen.bind(this))
          .on('message', this.onconnectionmessage.bind(this));
      // });
    });
  });
};

Discord.prototype.disconnect = function () {
  const { connection } = this;
  if (!connection)
    return Promise.resolve();

  this.state = 'DISCONNECTING';

  return new Promise(resolve => {
    connection.once('close', resolve);
    connection.close(1001);
  });
};

Discord.prototype.resume = function () {
  this.state = 'RESUMING';

  const { session_id, resume_gateway_url } = this;
  
  const addr = resume_gateway_url+'/?encoding=json&v='+Discord.API_VERSION;

  this.connection = new WebSocket(addr)
    .on('error', this.onconnectionerror.bind(this))
    .on('close', this.onconnectionclose.bind(this))
    .on('open', this.onconnectionopen.bind(this))
    .on('message', this.onconnectionmessage.bind(this));
};

Discord.prototype._authenticate = function () {
  const { token, type, connection, state, session_id } = this;

  const payload = { op: 2 };

  if ('CONNECTING' === state) {
    const auth_template = require('./templates/'+('bot' === type ? 'auth-bot' : 'auth-user'));

    auth_template.token = token;

    if ('user' === type)
      auth_template.properties.browser_user_agent = Http2Client.user_agent;

    payload.d = auth_template;
  } else if ('RESUMING' === state) {
    payload.op = 6;
    payload.d = { token, session_id, seq: this.last_seq };
  }

  connection.write(payload);
};

Discord.prototype.onconnectionerror = function (err) {
  this.logger.error('connection error');
};

Discord.prototype.onconnectionclose = function (code, buff) {
  const { heartbeat_interval_id, state, session_id, seq, logger, api_manager } = this;

  clearInterval(heartbeat_interval_id);

  if ('CONNECTING' === state)
    if (4004 === code)
      this.emit('authComplete', false);

  this.state = 'CLOSED';
  this.ready = false;
  this.heartbeat_interval_id = void 0;
  this.last_seq = seq;

  logger.warn('discord: connection close, code: %d, data: %s', code, String(buff));

  if (1000 === code || 1001 === code)
    return api_manager.close();

  if (this.session_id)
    this.resume();
  else
    setTimeout(this.connect.bind(this), rand(1e3, 2e3));
};

Discord.prototype.onconnectionopen = function () {
  this.logger.verbose('connection open');
};

Discord.prototype.onconnectionmessage = function (msg) {
  const data = JSON.parse(msg);
  const { t, s, op, d } = data;
  
  this.seq = s;

  if (0 === op) {
    if (!this.emit(t, d))
      log(t);
  } else {
    this.emit('op::'+op, d) || log(op); 
  }
};

Discord.prototype.onInvalidSession = function () {
  const { logger, connection } = this;

  this.session_id = void 0;

  logger.warn('discord: received INVALID_SESSION event');
  connection.close();
}; 

Discord.prototype.onHeartbeatInterval = function (data) {
  const { heartbeat_interval } = data;

  if ('CONNECTING' === this.state || 'RESUMING' === this.state)
    this._authenticate();
  
  clearInterval(this.heartbeat_interval_id);
  this.heartbeat_interval_id = setInterval(this.heartbeat.bind(this), heartbeat_interval);
  this.heartbeat();
};

Discord.prototype.onHeartbeatAck = noop;

Discord.prototype.onHeartbeatRequest = function (data) {
  log(data);
  this.logger.error('discord: recv heartbeat request');
  this.heartbeat();
};

Discord.prototype.heartbeat = function () {
  this.connection.write({ op: 1, d: { s: this.seq }});
};

Discord.prototype.onReady = async function (data) {
  const { command_manager, logger } = this;
  const { session_id, resume_gateway_url, user, guilds } = data;

  this.session_id = session_id;
  this.resume_gateway_url = resume_gateway_url;
  this.username = user.username;
  this.user_email = user.email;
  this.user = user;

  for (const guild of guilds) {
    if (!guild.properties)
      continue;
    this.emit('GUILD_CREATE', guild);
  }

  if (user.bot)
    await new Promise(resolve => this.once('GUILD_CREATE', resolve));

  this.state = 'CONNECTED';
  this.ready = true;
  logger.verbose('auth ok | %s%s', user.username, user.bot ? ', commands('+command_manager.size+')' : '');
  this.emit('authComplete', true);
  this.emit('ready');
};

Discord.prototype.onResumed = function (data) {
  this.state = 'CONNECTED';
  this.ready = true;
  this.logger.verbose('resumed');
  this.emit('resumed');
};

Discord.prototype.createMessage = function (channel_id, content, embeds = []) {
  const { logger, api_manager } = this;
  return api_manager.post('/channels/'+channel_id+'/messages', { content, embeds, tts: !1 }).then(res => {
    const { status_code, data } = res;

    if (200 !== status_code)
      return void logger.warn('createMessage: request error, http(%d)', status_code);

    return data.id;
  });
};

Discord.prototype.deleteMessage = function (channel_id, message_id) {
  const { logger, api_manager } = this;
  return api_manager.delete('channels/'+channel_id+'/messages/'+message_id).then(res => {
    const { status_code, data } = res;

    if (204 !== status_code)
      return logger.warn('deleteMessage: request error, http(%d)', status_code), false;

    logger.verbose('message delete ok');
    return true;
  });
};