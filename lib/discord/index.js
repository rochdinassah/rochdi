// author: rochdi nassah
// created: 2025/09/22

'use strict';

const WebSocket = require('ws');
const EventEmitter = require('node:events');
const Http2Client = require('../http2-client');
const Guild = require('./guild');
const authTemplate = require('./auth-template');
const Logger = require('../logger');

WebSocket.prototype.write = function () {
  arguments[0] = JSON.stringify(arguments[0]);
  this.send(...arguments);
};

module.exports = Discord;

Discord.prototype = new EventEmitter();

const xsp = 'eyJvcyI6IkxpbnV4IiwiYnJvd3NlciI6IkNocm9tZSIsImRldmljZSI6IiIsInN5c3RlbV9sb2NhbGUiOiJlbi1VUyIsImhhc19jbGllbnRfbW9kcyI6ZmFsc2UsImJyb3dzZXJfdXNlcl9hZ2VudCI6Ik1vemlsbGEvNS4wIChYMTE7IExpbnV4IHg4Nl82NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0MC4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTQwLjAuMC4wIiwib3NfdmVyc2lvbiI6IiIsInJlZmVycmVyIjoiIiwicmVmZXJyaW5nX2RvbWFpbiI6IiIsInJlZmVycmVyX2N1cnJlbnQiOiIiLCJyZWZlcnJpbmdfZG9tYWluX2N1cnJlbnQiOiIiLCJyZWxlYXNlX2NoYW5uZWwiOiJzdGFibGUiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjo0NDg2NzUsImNsaWVudF9ldmVudF9zb3VyY2UiOm51bGwsImNsaWVudF9sYXVuY2hfaWQiOiJjMWU3MmZjYy05ZDk3LTQ1MTItOWU2YS1iYTQyOWQ4MjMyN2YiLCJsYXVuY2hfc2lnbmF0dXJlIjoiMDg1YmE2MGMtNDVhNC00M2I0LTgyNDQtYmFiNzEyMjE2MzhlIiwiY2xpZW50X2hlYXJ0YmVhdF9zZXNzaW9uX2lkIjoiMjQyOTkxYTMtYmJhOC00YjJlLWI2ZDctZjk5YjEzMzg0YWM0IiwiY2xpZW50X2FwcF9zdGF0ZSI6ImZvY3VzZWQifQ==';

for (const method of ['get', 'post', 'delete', 'put', 'patch']) {
  Discord.prototype[method] = function (endpoint, body, headers) {
    const { http2_client, token } = this;
    const url = 'https://discord.com/api/v9/'+endpoint.trim('\/');
    headers = {
      'Authorization': token,
      'User-Agent': '',
      'X-Super-Properties': xsp,
      ...headers
    };
    if (body)
      headers['Content-Type'] = 'application/json';
    return http2_client[method](url, { headers, body });
  };
}

function Discord(token) {
  this.token = token;

  this.guilds = new Map();
  this.http2_client = new Http2Client();
  this.logger = new Logger({ prefix: 'discord' });
  
  this.on('op::10', this.onHeartbeatInterval);
  this.on('READY', this.onReady);

  this.on('GUILD_ROLE_CREATE', this.onGuildRoleCreate);
  this.on('GUILD_ROLE_DELETE', this.onGuildRoleDelete);
  this.on('GUILD_ROLE_UPDATE', this.onGuildRoleUpdate);

  this.on('CHANNEL_CREATE', this.onChannelCreate);
  this.on('CHANNEL_UPDATE', this.onChannelUpdate);
  this.on('CHANNEL_DELETE', this.onChannelDelete);

  this.on('MESSAGE_CREATE', this.onMessageCreate);
}

Discord.prototype.getGuildByNameId = function (nameId) {
  const { guilds } = this;
  for (const guild of guilds.values()) {
    if (new RegExp(nameId, 'i').test(guild.properties.name))
      return guild;
  }
};

Discord.prototype.connect = function (token) {
  return new Promise(resolve => {
    if (token)
      this.token = token;

    this.once('authComplete', resolve);

    this.connection = new WebSocket('wss://gateway.discord.gg/?encoding=json&v=9')
      .on('error', this.onconnectionerror.bind(this))
      .on('close', this.onconnectionclose.bind(this))
      .on('open', this.onconnectionopen.bind(this))
      .on('message', this.onconnectionmessage.bind(this));
  });
};

Discord.prototype._authenticate = function () {
  const { token, http2_client, connection } = this;
  authTemplate.token = token;
  authTemplate.properties.browser_user_agent = http2_client.userAgent;
  connection.write({ op: 2, d: authTemplate });
};

Discord.prototype.onconnectionerror = function (err) {
  this.logger.error('connection error');
};

Discord.prototype.onconnectionclose = function (code, buff) {
  clearInterval(this._heartbeat_interval_id);
  if (4004 === code)
    this.emit('authComplete', false);
  this.ready = false;
  this.logger.warn('connection close, code: %d, data: %d', code, String(buff));
  setTimeout(this.connect.bind(this), rand(1e3, 3e3));
};

Discord.prototype.onconnectionopen = function () {
  this.logger.verbose('connection open');
};

Discord.prototype.onconnectionmessage = function (buff) {
  const data = JSON.parse(String(buff));
  const { t, s, op, d } = data;

  this._seq = s;

  if (0 === op)
    // this.emit(t, d) || log(data);
    this.emit(t, d) || noop;
  else
    this.emit('op::'+op, d) || noop;
};

Discord.prototype.onHeartbeatInterval = function (data) {
  const { heartbeat_interval } = data;

  if (!this._heartbeat_interval_id)
    this._authenticate();

  clearInterval(this._heartbeat_interval_id);
  this._heartbeat_interval_id = setInterval(() => {
    this.connection.write({ op: 1, d: { s: this._seq }});
  }, heartbeat_interval);
};

Discord.prototype.onHeartbeatAck = function () {
  this.logger.verbose('heartbeat ack');
};

Discord.prototype.onReady = function (data) {
  const { user, guilds } = data;

  this.username = user.username;
  this.user_id = user.id;
  this.user_email = user.email;
  this.user = user;

  for (const guild of guilds)
    this.guilds.set(guild.id, new Guild(this, guild));

  this.logger.verbose('auth ok | %s', user.username);
  this.ready = true;
  this.emit('authComplete', true);
  this.emit('ready');
};

Discord.prototype.onGuildRoleCreate = function (data, isUpdate) {
  const { role, guild_id } = data;
  const { guilds } = this;

  const guild = guilds.get(guild_id);
  const { roles } = guild;

  roles.set(role.id, new Role(this, role));
};

Discord.prototype.onGuildRoleDelete = function (data) {
  const { role_id, guild_id } = data;
  const { guilds } = this;

  const guild = guilds.get(guild_id);
  const { roles } = guild;
  const role = roles.get(role_id);

  roles.delete(role.id);  
};

Discord.prototype.onGuildRoleUpdate = function (data) {
  this.onGuildRoleCreate(data, true);
};

Discord.prototype.onChannelCreate = function (data, isUpdate) {
  const { guild_id } = data;
  const { guilds } = this;

  const guild = guilds.get(guild_id);
  const { channels } = guild;
  const channel = new Channel(guild, data);

  channels.set(channel.id, channel);
};

Discord.prototype.onChannelUpdate = function (data) {
  this.onChannelCreate(data, true);
};

Discord.prototype.onChannelDelete = function (data) {
  const { guild_id, name, id } = data;
  const { guilds } = this;

  const guild = guilds.get(guild_id);
  const { channels } = guild;

  channels.delete(id);
};

Discord.prototype.onMessageCreate = function (data) {
  const { type, timestamp, id, content, channel_id, author, guild_id } = data;

  const guild = this.guilds.get(guild_id);
  const channel = guild.channels.get(channel_id);

  channel.emit('message', data);
};