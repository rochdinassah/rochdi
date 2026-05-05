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
const NotificationManager = require('./manager/notification');
const TimerManager = require('../manager/timer');

const { WebSocketServer, WebSocket } = ws;
const { ServerResponse } = http;

const { PWD, DISCORD_BOT_TOKEN } = process.env;

function initCache() {
  const cache_path = PWD+'/cache/backup.json';

  if (!existsSync(cache_path)) {
    require('node:fs').mkdirSync(PWD+'/cache');
    saveJson(cache_path, {});
  }

  // return require(cache_path);
}

exit(initCache());

class Server extends WebSocketServer {
  constructor(opts = {}) {
    const http_server = http.createServer();

    super({ server: http_server, clientTracking: false });

    const { port, notification_channel, cache_key, ping_interval, states } = opts;

    const logger = this.logger = opts.logger || new Logger.SilentLogger();
    
    this.port = port;
    this.notification_channel = notification_channel;
    this.ping_interval = ping_interval ?? 3e4;
    this.http_server = http_server;
    this.cache_key = cache_key;
    this.cache = initCache();

    this.routes = [];

    this.clients = new Map();
    this.clients_counter = 0;

    this.clients.add = noop;

    this.state_manager = new StateManager({ states });
    this.http_client = new HttpClient({ logger });
    this.http2_client = new Http2Client({ logger});
    this.discord = new Discord(DISCORD_BOT_TOKEN, { logger, bot_user: true });
    this.command_manager = new CommandManager();
    this.notification_manager = new NotificationManager(this);
    this.timer_manager = new TimerManager();

    if (cache_key) {
      this.redis_client = new RedisClient({ logger });
      this.redis_client.on('Ready', this.onRedisReady.bind(this));
    }

    if (notification_channel)
      this.notification_manager.connect();

    this.on('connection', this[Symbol.for('onConnection')]);
    this.on('Pong', this.onPong);
    this.on('EchoRequestMessage', this.onEchoRequestMessage);
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
    
    http_server.on('request', this[Symbol.for('onRequest')].bind(this)).listen(port, '::0', () => {
      resolve(this.awaitReady());
    });

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
  const path = new URL('http://127.1'+url).pathname.trim('/');
  for (const route of this.routes)
    if (method === route.method || route.method === 'ANY')
      if (route.match(path))
        return route.run(this, req, res);
  res.status(404, 'Not Found').send();
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

  if (!redis_client || redis_client.connected)
    return void logger.warn('Server.rollback: redis_client is either not connected or not set');

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

Server.prototype.awaitNotificationReady = function () {
  if (this.discord.channel || !this.notification_channel)
    return Promise.resolve();
  return new Promise(resolve => this.once('NotificationReady', resolve));
};

// issue notification
Server.prototype.notify = function (content, opts = {}) {
  return this.notification_manager.notify(content, opts);
};

Server.prototype.notifyError = function (content, opts = {}) {
  return this.notification_manager.notify(content, { ...opts, level: 'error' });
};

Server.prototype.notifyInfo = function (content, opts = {}) {
  return this.notification_manager.notify(content, { ...opts, level: 'info' });
};

Server.prototype.notifyWarn = function (content, opts = {}) {
  return this.notification_manager.notify(content, { ...opts, level: 'warn' });
};

Server.prototype.notifyVerbose = function (content, opts = {}) {
  return this.notification_manager.notify(content, { ...opts, level: 'verbose' });
};

Server.prototype.awaitReady = function () {
  const { cache_key, notification_channel } = this;

  const promises = [];

  if (cache_key)
    promises.push(this.awaitCacheReady());

  if (notification_channel)
    promises.push(this.awaitNotificationReady());

  return Promise.all(promises);
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

ServerResponse.prototype.status = function (code, message) {
  this.statusCode = code;
  this.statusMessage = message;
  return this;
};

ServerResponse.prototype.send = function (data, headers = {}) {
  for (const key of Object.keys(headers))
    this.setHeader(key, headers[key]);

  if ('object' === typeof data)
    data = JSON.stringify(data);

  this.end(data);
  return this;
};