// author: rochdi nassah
// created: 2025/09/22

'use strict';

const WebScocket = require('ws');
const EventEmitter = require('node:events');
const Http2Client = require('./http2-client');

WebScocket.prototype[Symbol.for('send')] = WebScocket.prototype.send;
WebScocket.prototype.send = function () {
  arguments[0] = JSON.stringify(arguments[0]);
  this[Symbol.for('send')](...arguments);
};

module.exports = Discord;

Discord.prototype = new EventEmitter();

const xsp = 'eyJvcyI6IkxpbnV4IiwiYnJvd3NlciI6IkNocm9tZSIsImRldmljZSI6IiIsInN5c3RlbV9sb2NhbGUiOiJlbi1VUyIsImhhc19jbGllbnRfbW9kcyI6ZmFsc2UsImJyb3dzZXJfdXNlcl9hZ2VudCI6Ik1vemlsbGEvNS4wIChYMTE7IExpbnV4IHg4Nl82NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0MC4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTQwLjAuMC4wIiwib3NfdmVyc2lvbiI6IiIsInJlZmVycmVyIjoiIiwicmVmZXJyaW5nX2RvbWFpbiI6IiIsInJlZmVycmVyX2N1cnJlbnQiOiIiLCJyZWZlcnJpbmdfZG9tYWluX2N1cnJlbnQiOiIiLCJyZWxlYXNlX2NoYW5uZWwiOiJzdGFibGUiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjo0NDg2NzUsImNsaWVudF9ldmVudF9zb3VyY2UiOm51bGwsImNsaWVudF9sYXVuY2hfaWQiOiJjMWU3MmZjYy05ZDk3LTQ1MTItOWU2YS1iYTQyOWQ4MjMyN2YiLCJsYXVuY2hfc2lnbmF0dXJlIjoiMDg1YmE2MGMtNDVhNC00M2I0LTgyNDQtYmFiNzEyMjE2MzhlIiwiY2xpZW50X2hlYXJ0YmVhdF9zZXNzaW9uX2lkIjoiMjQyOTkxYTMtYmJhOC00YjJlLWI2ZDctZjk5YjEzMzg0YWM0IiwiY2xpZW50X2FwcF9zdGF0ZSI6ImZvY3VzZWQifQ==';
const headers = {
  'Authorization': '',
  'User-Agent': '',
  'X-Super-Properties': xsp,
};

function Discord(token) {
  this.token = token;

  this.guilds = new Map();
  this.http2Client = new Http2Client({ headers });
  
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
        browser_user_agent: this.http2Client.userAgent,
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
  // log('heartbeat interval set to', formatDuration(heartbeat_interval));
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
    this.guilds.set(guild.id, new Guild(this, guild));
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
  constructor(manager, opts = {}) {
    this.manager = manager;
    this.properties = opts.properties;
    this.member_count = opts.member_count;
    this.joined_at = opts.joined_at;
    this.id = opts.id;

    this.roles = new Map();
    this.channels = new Map();

    for (const role of opts.roles) {
      this.roles.set(role.id, new Role(manager, role));
    }
    for (const channel of opts.channels) {
      this.channels.set(channel.id, new Channel(manager, channel));
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

  _createChannel(type, name, isPrivate) {
    const permission_overwrites = !isPrivate ? [] : [{
      id: this.id,
      type: 0,
      allow: '0',
      deny: '1049600'
    }];
    const url = 'https://discord.com/api/v9/guilds/'+this.id+'/channels';
    const headers = {
      'Authorization': this.manager.token,
      'Content-Type': 'application/json'
    };
    const body = { type, name, permission_overwrites };
    return this.manager.http2Client.post(url, { headers, body }).then(res => {
      const { statusCode, data } = res;
      if (201 !== statusCode)
        throw new Error('_createChannel: request error, http('+statusCode+')');
      const channel = new Channel(this.manager, data);
      this.channels.set(channel.id, channel);
      return log('channel "%s" created', channel.name), channel;
    });
  }

  createTextChannel(name, isPrivate) {
    return this._createChannel(0, name, isPrivate);
  }

  createVoiceChannel(name, isPrivate) {
    return this._createChannel(2, name, isPrivate);
  }
}

class Role {
  constructor(manager, opts = {}) {
    this.manager = manager;
    this.position = opts.position;
    this.permissions = opts.permissions;
    this.id = opts.id;
  }
}

class Channel {
  constructor(manager, opts = {}) {
    this.manager = manager;
    this.name = opts.name;
    this.id = opts.id;
  }

  delete() {

  }
}