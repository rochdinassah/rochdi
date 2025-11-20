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
const RequestService = require('./services/request');
const GuildService = require('./services/guild');
const ChannelService = require('./services/channel');
const CommandService = require('./services/command');
const InteractionService = require('./services/interaction');

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
  this.state = 'CLOSED';

  this.logger = logger ?? new Logger.SilentLogger();
  this.http2_client = new Http2Client();

  this.commands = new Map();

  this.request_service = new RequestService(this);
  this.guild_service = new GuildService(this);
  this.channel_service = new ChannelService(this);
  this.command_service = new CommandService(this);
  this.interaction_service = new InteractionService(this);

  this.on('op::9', this.onInvalidSession);
  this.on('op::10', this.onHeartbeatInterval);
  this.on('op::11', this.onHeartbeatAck);
  this.on('op::1', this.onHeartbeatRequest);

  this.on('READY', this.onReady);
  this.on('READY_SUPPLEMENTARY', exit);
  this.on('RESUMED', this.onResumed);

  this.on('INTERACTION_CREATE', this.onInteractionCreate);
}

Discord.prototype.getGuildByNameId = function (name_id) {
  const { guilds } = this;
  for (const guild of guilds.values())
    if (new RegExp(name_id, 'i').test(guild.properties.name))
      return guild;
};

Discord.prototype.connect = function () {
  this.state = 'CONNECTING';

  return new Promise(resolve => {
    this.me().then(() => {
      const { request_service, type } = this;

      request_service.get('gateway'+('bot' === type ? '/bot' : '')).then(res => {
        const { status_code, data } = res;

        if (200 !== status_code)
          throw new Error('gateway fetch request error, http('+status_code+')');

        const { url } = data;

        const addr = url+'/?encoding=json&v='+Discord.API_VERSION;

        this.once('authComplete', resolve);
        this.connection = new WebSocket(addr)
          .on('error', this.onconnectionerror.bind(this))
          .on('close', this.onconnectionclose.bind(this))
          .on('open', this.onconnectionopen.bind(this))
          .on('message', this.onconnectionmessage.bind(this));
      });
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
  const { token, type, http2_client, connection, state, session_id } = this;

  const payload = { op: 2 };

  if ('CONNECTING' === state) {
    const auth_template = require('./templates/'+('bot' === type ? 'auth-bot' : 'auth-user'));

    auth_template.token = token;

    if ('user' === type)
      auth_template.properties.browser_user_agent = http2_client.user_agent;

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
  const { heartbeat_interval_id, state, session_id, seq, logger, request_service } = this;

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
    return request_service.destroy();

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

Discord.prototype.onInvalidSession = function (data) {
  this.logger.warn('discord: received INVALID_SESSION event');
  this.disconnect(1001);
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
  const { commands } = this;
  const { session_id, resume_gateway_url, user, guilds } = data;

  this.session_id = session_id;
  this.resume_gateway_url = resume_gateway_url;
  this.username = user.username;
  this.user_id = this.application_id = user.id;
  this.user_email = user.email;
  this.user = user;

  for (const guild of guilds) {
    if (!guild.properties)
      continue;
    this.emit('GUILD_CREATE', guild);
  }

  this.state = 'CONNECTED';

  if (user.bot)
    await this.fetchCommands();

  this.ready = true;
  this.logger.verbose('auth ok | %s%s', user.username, user.bot ? ', commands('+commands.size+')' : '');
  this.emit('authComplete', true);
  this.emit('ready');
};

Discord.prototype.onResumed = function (data) {
  this.state = 'CONNECTED';
  this.ready = true;
  this.logger.verbose('resumed');
  this.emit('resumed');
};

Discord.prototype.onInteractionCreate = function (data) {
  const { logger, commands } = this;
  const { type, token, id, guild_id, channel_id } = data;

  const user = data.member ? data.member.user : data.user;
  
  const username = user.global_name ?? user.username;
  const command = commands.get(data.data.id);
  const interaction_id = id;

  logger.verbose('received "%s" command interaction from "%s"', command.name, username);

  this.emit('interaction::'+command.name, { type, token, id });
};

Discord.prototype.respondInteraction = function (opts = {}) {
  const { id, token, data } = opts;
  const body = {
    type: 4,
    data
  };
  return this.request_service.post(format('interactions/%s/%s/callback', id, token), body);
};

Discord.prototype.me = function (attempt = 1) {
  if (3 === attempt)
    throw new Error('Discord.me: unable to retrieve user infos');
  
  const { logger, request_service, token } = this;
  const headers = {
    'authorization': 2 === attempt ? token : 'Bot '+token
  };
  return request_service.get('users/@me', void 0, headers).then(res => {
    const { status_code, data } = res;
    if (401 === status_code)
      return this.me(1+attempt);
    if (200 !== status_code)
      throw new Error('Discord.me: request error, http('+status_code+')');
    this.type = data.bot ? 'bot' : 'user';
    request_service.compileHeaders();
  });
};

Discord.prototype.createMessage = function (channel_id, content, embeds) {
  const { logger } = this;
  const body = {
    content,
    embeds,
    tts: false,
  };
  return this.request_service.post('/channels/'+channel_id+'/messages', body).then(res => {
    const { status_code, data } = res;
    if (200 !== status_code)
      return logger.warn('createMessage: request error, http(%d)', status_code);
    const { type, content, timestamp, id, channel_id, author } = data;
    return id;
  });
};

Discord.prototype.deleteMessage = function (channel_id, message_id) {
  return this.request_service.delete(format('channels/%s/messages/%s', channel_id, message_id)).then(res => {
    const { status_code, data } = res;
    if (204 !== status_code)
      return this.logger.warn('deleteMessage: request error, http(%d)', status_code), false;
    return this.logger.verbose('message delete ok'), true;
  });
};

Discord.prototype.clearDM = function (conversation_id, offset = 0) {
  const { logger, user_id } = this;

  return this.request_service.get(format('channels/%s/messages/search?author_id=%s&offset=%d', conversation_id, user_id, offset)).then(async res => {
    const { status_code, data } = res;
    // if (200 !== status_code)
    //   return false;
    const { messages, total_results } = data;

    logger.verbose('messages list ok, total(%d)', total_results);

    for (const message of messages) {
      const { channel_id, id } = message[0];
      await this.deleteMessage(channel_id, id);
      await new Promise(resolve => setTimeout(resolve, rand(900, 1200)));
    }

    await new Promise(resolve => setTimeout(resolve, 1e4));

    return this.clearDM(conversation_id, 1+offset);
  });
};

Discord.prototype.fetchCommands = function () {
  const { logger, application_id, commands } = this;
  return this.request_service.get(format('applications/%s/commands', application_id)).then(res => {
    const { status_code, data } = res;

    if (200 !== status_code)
      return logger.warn('fetchCommands: request error, http(%d)', status_code);
    
    data.forEach(command => this.commands.set(command.id, command));
  });
};

Discord.prototype.createCommand = function (opts = {}) {
  const { application_id, logger, commands } = this;
  const { name, description } = opts;

  const body = {
    name,
    description,
    type: 1
  };

  return this.request_service.post(format('applications/%s/commands', application_id), body).then(res => {
    const { status_code, data } = res;

    if (200 === status_code)
      return logger.verbose('createCommand: command "%s" already exists', opts.name), false;

    if (201 !== status_code)
      return logger.warn('createCommand: request error, http(%d)', status_code), false;

    commands.set(data.id, data);
    logger.verbose('command "%s" created | commands size: %d', data.name, commands.size);

    return data;
  });
};

Discord.prototype.deleteCommand = function (command_id) {
  const { logger, application_id, commands } = this;
  
  const command = commands.get(command_id);

  if (!command)
    return logger.warn('deleteCommand: command_id "%s" doesn\'t exist', command_id), Promise.resolve(false);

  return this.request_service.get(format('applications/%s/commands/%s', application_id, command_id)).then(res => {
    const { status_code, data } = res;

    if (204 !== status_code)
      return logger.warn('deleteCommand: request error, http(%d)', status_code), false;

    commands.delete(command_id);
    logger.verbose('command "%s" deleted | commands size: %d', command.name, commands.size);

    return true;
  });
};