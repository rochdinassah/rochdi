// author: rochdi nassah
// created: 2025/09/22

'use strict';

const WebScocket = require('ws');
const EventEmitter = require('node:events');
const Http2Client = require('./http2-client');

const http2Client = new Http2Client();

WebScocket.prototype[Symbol.for('send')] = WebScocket.prototype.send;
WebScocket.prototype.send = function () {
  arguments[0] = JSON.stringify(arguments[0]);
  this[Symbol.for('send')](...arguments);
};

module.exports = Discord;

Discord.prototype = new EventEmitter();

function Discord(token) {
  this.token = token;

  this.guilds = new Map();
  
  this.on('op::10', this.onHeartbeatInterval);
  // this.on('op::11', this.onHeartbeatAck);

  this.on('READY', this.onReady);

  this.once('op::10', this._authenticate);
}

Discord.prototype.connect = function (token) {
  return new Promise(resolve => {
    if (token)
      this.token = token;

    this.once('authComplete', resolve);

    this.connection = new WebScocket('wss://gateway.discord.gg/?encoding=json&v=9')
      .on('error', this.onconnectionerror.bind(this))
      .on('close', this.onconnectionclose.bind(this))
      .on('open', this.onconnectionopen.bind(this))
      .on('message', this.onconnectionmessage.bind(this));
  });
};

Discord.prototype._authenticate = function () {
  const payload = {
    op: 2,
    d: {
      token: this.token ?? '',
      capabilities: 1734653,
      properties: {
        os: 'Linux',
        browser: 'Chrome',
        device: '',
        system_locale: 'en-US',
        has_client_mods: false,
        browser_user_agent: http2Client.userAgent,
        browser_version: '140.0.0.0',
        os_version: '',
        referrer: '',
        referring_domain: '',
        referrer_current: '',
        referring_domain_current: '',
        release_channel: 'stable',
        client_build_number: 447677,
        client_event_source: null,
        client_launch_id: '7a8a9f44-d842-49d2-be16-c5f1aee0cfa1',
        launch_signature: 'f5440867-d3ec-43a7-9814-caaf54ac7513',
        client_app_state: 'unfocused',
        is_fast_connect: false,
        gateway_connect_reasons: 'AppSkeleton'
      },
      presence: { status: 'unknown', since: 0, activities: [], afk: false },
      compress: false,
      client_state: { guild_versions: {} }
    }
  }
  this.connection.send(payload);
};

Discord.prototype.onconnectionerror = function (err) {
  log(err);
  exit('discord connection error');
};

Discord.prototype.onconnectionclose = function (code, buff) {
  clearInterval(this._heartbeatIntervalId);
  if (4004 === code)
    this.emit('authComplete', false);
  log('discord connection close, code: %d, data: %s', code, String(buff));
};

Discord.prototype.onconnectionopen = function () {
  log('discord connection open');
};

Discord.prototype.onconnectionmessage = function (buff) {
  const data = JSON.parse(String(buff));
  const { t, s, op, d } = data;

  this._seq = s;

  if (0 === op)
    this.emit(t, d);
  else
    if (!this.emit('op::'+op, d))
      log(op, t);
};

Discord.prototype.onHeartbeatInterval = function (data) {
  const { heartbeat_interval } = data;
  clearInterval(this._heartbeatIntervalId);
  this._heartbeatIntervalId = setInterval(() => {
    this.connection.send({ op: 1, d: { s: this._seq }});
  }, heartbeat_interval);
  log('heartbeat interval set to', formatDuration(heartbeat_interval));
};

Discord.prototype.onHeartbeatAck = function () {
  log('heartbeat ack');
};

Discord.prototype.onReady = function (data) {
  const { user, guilds } = data;
  this.username = user.username;
  this.userId = user.id;
  this.userEmail = user.email;
  this.user = user;
  for (const guild of guilds) {
    const { roles, properties, member_count, joined_at, id, channels } = guild;
    this.guilds.set(id, new Guild({ roles, properties, member_count, joined_at, id, channels }));
  }
  log('auth ok | %s', user.username);
  this.emit('authComplete', true);
};

Discord.prototype.getGuildByNameId = function (nameId) {
  const { guilds } = this;
  for (const guild of guilds.values()) {
    if (new RegExp(nameId, 'i').test(guild.properties.name))
      return guild;
  }
};

class Guild {
  constructor(opts = {}) {
    const { roles, properties, member_count, joined_at, id, channels } = opts;

    this.roles = new Map();
    this.properties = properties;
    this.member_count = member_count;
    this.joined_at = joined_at;
    this.id = id;
    this.channels = new Map();

    for (const role of roles) {
      const { position, permissions, name, id } = role;
      this.roles.set(id, { position, permissions, name, id });
    }

    for (const channel of channels) {
      const { name, id } = channel;
      this.channels.set(id, { name, id });
    }
  }

  getRoleByNameId(nameId) {
    for (const role of this.roles.values()) {
      if (new RegExp(nameId, 'i').test(role.name))
        return role;
    }
  }

  getChannelByNameId(nameId) {
    for (const channel of this.channels.values()) {
      if (new RegExp(nameId, 'i').test(channel.name))
        return channel;
    }
  }
}