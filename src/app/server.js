// author: rochdi nassah

'use strict';

const http = require('node:http');
const Route = require('./_route');
const StateManager = require('../manager/state');
const ws = require('ws');
const Logger = require('../logger');
const CommandManager = require('../manager/command');
const HttpClient = require('../http-client');
const Http2Client = require('../http2-client');
const RedisClient = require('./redis');
const Discord = require('../discord');

const { WebSocketServer, WebSocket } = ws;
const { env } = process;

class Server extends WebSocketServer {
  constructor(opts = {}) {
    const http_server = http.createServer();

    super({ server: http_server, clientTracking: false });

    const discord_bot_token = decrypt(
      'sFyeftxBt0SYaKx+z4T0YFZRKuW4GSb85YBFEphdDnXwsCtrqtAJbu7ZnELKYechfrpQZXBkneR+TBlhqaWMmMFxb6odWqTYc6EFZb2mD7k=',
      env.ENCRYPTION_PASSWORD
    );

    const { port, notification_channel, ping_interval, states } = opts;

    if (!notification_channel)
      exit('Server.constructor: "notification_channel" option is missing');

    const logger = this.logger = opts.logger || new Logger.SilentLogger();
    
    this.port = port;
    this.notification_channel = notification_channel;
    this.ping_interval = ping_interval ?? 3e4;
    this.http_server = http_server;
    this.cache_key = env.CACHE_KEY;

    this.routes = [];

    this.clients = new Map();
    this.clients_counter = 0;

    this.clients.add = noop;

    this.state_manager = new StateManager({ states });
    this.command_manager = new CommandManager();
    this.http_client = new HttpClient({ logger });
    this.http2_client = new Http2Client({ logger});
    this.redis_client = new RedisClient({ logger });
    this.discord = new Discord(discord_bot_token, { logger, bot_user: true });

    this.on('connection', this[Symbol.for('onConnection')]);
    this.on('Pong', this.onPong);
    this.on('EchoRequestMessage', this.onEchoRequestMessage);
    this.on('DiscordMessage', this.onDiscordMessage);

    this.redis_client.on('Ready', this.onRedisReady.bind(this));
    this.discord.on('Ready', this.onDiscordReady.bind(this));
    this.discord.on('Resumed', this.onDiscordResumed.bind(this));
    this.discord.connect();
  }

  onEchoRequestMessage(client, data) {
    client.reply(data.seq, { echo_value: data.value });
    client.sendMessage('EchoRequestMessage', { value: randomString(4) }, reply => {
      log('client reply:', reply);
    });
  }
}

for (const method of ['GET', 'POST', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT', 'ANY']) {    
  Server.prototype[method.toLowerCase()] = function (path, handler) {
    this.routes.push(new Route(method.toUpperCase(), path, handler));
  };
}

Server.prototype.run = function () {
  return new Promise(resolve => {
    const { port, ping_interval, http_server, logger, pingClients } = this;
    
    http_server.on('request', this[Symbol.for('onRequest')].bind(this)).listen(port, '::0', resolve);

    if (false !== ping_interval)
      this.ping_interval_id = setInterval(pingClients.bind(this), ping_interval);
  });
};

Server.prototype.close = function () {
  return new Promise(resolve => {
    const { http_server, ping_interval_id } = this;
    clearInterval(this.ping_interval_id);
    http_server.close(resolve);
  });
};

Server.prototype.pingClients = function () {
  const { clients } = this;
  clients.forEach(client => {
    if (!client.resolved_ping)
      return client.close(1009, 'unresponsive connection');
    client.ping();
  });
};

Server.prototype.acquire = function () {
  return this.state_manager.acquire(...arguments);
};

Server.prototype.release = function () {
  return this.state_manager.release();
};

Server.prototype.lock = function () {
  return this.state_manager.lock(...arguments);
};

Server.prototype.unlock = function () {
  return this.state_manager.unlock();
};

Server.prototype.getState = function () {
  return this.state_manager.getState(...arguments);
};

Server.prototype.updateState = function () {
  return this.state_manager.updateState(...arguments);
};

Server.prototype.incrementState = function () {
  return this.state_manager.incrementState(...arguments);
};

Server.prototype.decrementState = function () {
  return this.state_manager.decrementState(...arguments);
};

Server.prototype.checkStateSafety = function () {
  return this.state_manager.checkStateSafety(...arguments);
};

Server.prototype.awaitSafeState = function () {
  return this.state_manager.awaitSafeState(...arguments);
};

Server.prototype.onPong = function (client, data) {
  client.resolved_ping = true;
};

Server.prototype[Symbol.for('onRequest')] = function (req, res) {
  const { method, url } = req;
  const path = require('node:url').parse(url).path.trim('/');
  for (const route of this.routes)
    if (method === route.method || route.method === 'ANY')
      if (route.match(path))
        return route.run(this, req, res);
  res.writeHead(404).end();
};

Server.prototype[Symbol.for('onConnection')] = function (client) {
  const { clients, logger } = this;

  client.id = this.clients_counter++;
  client.resolved_ping = 'n/a';
  client.alive = true;

  clients.set(client.id, client);

  client.on('error', noop);
  client.on('close', this[Symbol.for('onDisconnection')].bind(this, client));
  client.on('message', this[Symbol.for('onConnectionMessage')].bind(this, client));

  this.emit('Attach', client);
};

Server.prototype[Symbol.for('onDisconnection')] = function (client, code, buff) {
  const { clients, logger } = this;

  client.alive = false;
  client.emit('Detach');

  clients.delete(client.id);

  this.emit('Detach', client);
};

Server.prototype[Symbol.for('onConnectionMessage')] = function (client, data) {
  const { t, d } = JSON.parse(data);
  client.emit(t, d);
  this.emit(t, client, d);
};

Server.prototype.onRedisReady = function () {
  const { redis_client, cache_key } = this;
  redis_client.get(cache_key).then(cache => {
    if (!cache)
      cache = {};
    setInterval(this.backup.bind(this), 24e5);
    onExit(this.backup.bind(this));
    this.cache = cache;
    this.emit('CacheReady');
  });
};

Server.prototype.awaitCacheReady = function () {
  const { cache } = this;
  if (cache)
    return Promise.resolve();
  return new Promise(resolve => this.once('CacheReady', resolve));
};

Server.prototype.backup = function (key) {
  const { redis_client, logger, cache, cache_key } = this;

  logger.verbose('backup in progress...');

  if (!redis_client || !redis_client.connected)
    return logger.warn('backup error'), Promise.resolve(false);

  return redis_client.set(key ?? cache_key, cache).then(() => {
    if (key)
      logger.verbose('backup checkpoint ok');
    return logger.verbose('backup ok'), true;
  });
};

Server.prototype.triggerBackup = function () {
  clearTimeout(this.backup_triggering_timeout_id);
  this.backup_triggering_timeout_id = setTimeout(this.backup.bind(this), 2**13);
};

Server.prototype.rollback = function () {
  const { logger, redis_client, cache_key } = this;

  logger.info('rollback in progress...');

  return redis_client.get(cache_key+'-backup').then(cache => {
    return redis_client.set(cache_key, cache).then(() => {
      logger.info('rollback complete');
      return cache;
    });
  });
};

Server.prototype.verifyCache = function (template = {}) {
  const { cache } = this;
  
  for (const key of Object.keys(template))
    if (null !== template[key] && getType(cache[key]) !== getType(template[key]))
      cache[key] = template[key];

  for (const key of Object.keys(cache))
    if (void 0 === template[key])
      delete cache[key];
};

Server.prototype.reset = function () {
  const { logger } = this;
  logger.verbose('resetting...');
  this.cache = {};
  this.backup().then(() => {
    logger.verbose('reset complete');
  });
};

Server.prototype.onDiscordReady = async function () {
  const { discord, notification_channel } = this;

  const guild = discord.getGuild('console');

  if (!guild)
    exit('Server.onDiscordReady: "console" guild missing');

  if (!guild.hasChannel(notification_channel))
    await guild.createTextChannel(notification_channel);
  
  const channel = guild.getChannel(notification_channel);
  channel.on('Message', this.onDiscordMessage.bind(this));
  discord.channel = channel;
  this.emit('NotificationReady');
};

Server.prototype.onDiscordResumed = function () {
  this.notify('discord session resumed');
};

Server.prototype.awaitNotificationReady = function () {
  if (this.discord.channel)
    return Promise.resolve();
  return new Promise(resolve => this.once('NotificationReady', resolve));
};

Server.prototype.onDiscordMessage = function (msg) {
  const { command_manager, discord } = this;
  const { author, content, channel_id, guild_id } = msg;
  
  if (discord.user.id === author.id)
    return;
};

Server.prototype.notify = function (content, opts = {}) {
  const { logger, discord } = this;
  const { level, skip_log } = opts;
  const { channel } = discord;

  if (!discord || !discord.ready || !channel)
    return Promise.resolve(false);

  if (!skip_log)
    logger.verbose(content);

  return channel.sendMessage(content);
};

Server.prototype.awaitReady = function () {
  return this.awaitCacheReady().then(this.awaitNotificationReady.bind(this));
};

module.exports = Server;

WebSocket.prototype.seq = 0;

WebSocket.prototype.sendMessage = function (type, data = {}, cb) {
  const { readyState } = this;
  if (1 === readyState) {
    const seq = data.seq = this.seq++;
    if (cb)
      this.once('Reply::'+seq, cb);
    this.send(JSON.stringify({ t: type, d: data }));
  }
};

WebSocket.prototype.ping = function () {
  this.resolved_ping = false;
  this.sendMessage('Ping');
};

WebSocket.prototype.reply = function (seq, data) {
  this.sendMessage('Reply::'+seq, data);
};

WebSocket.prototype.stop = function (reason, delay) {
  this.sendMessage('StopRequestMessage', { reason, delay });
};

WebSocket.prototype.restart = function (reason, delay) {
  this.sendMessage('RestartRequestMessage', { reason, delay });
};