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
const Discord = require('../discord');
const NotificationManager = require('./manager/notification');
const TimerManager = require('../manager/timer');

const { WebSocketServer, WebSocket } = ws;
const { ServerResponse } = http;

const { PWD, DISCORD_BOT_TOKEN } = process.env;

const CACHE_DIR_PATH = PWD+'/cache';
const CACHE_FILE_PATH = CACHE_DIR_PATH+'/backup.json';
const CACHE_GITIGNORE_FILE_PATH = CACHE_DIR_PATH+'/.gitignore';

class Server extends WebSocketServer {
  constructor(opts = {}) {
    const http_server = http.createServer();

    super({ server: http_server, clientTracking: false });

    const { port, notification_channel, ping_interval, states } = opts;

    const logger = this.logger = opts.logger || new Logger.SilentLogger();
    
    this.port = port;
    this.notification_channel = notification_channel;
    this.ping_interval = ping_interval ?? 3e4;
    this.http_server = http_server;

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

    this.initCache();
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

Server.prototype.initCache = function () {
  if (!existsSync(CACHE_DIR_PATH))
    mkdirSync(CACHE_DIR_PATH);

  if (!existsSync(CACHE_GITIGNORE_FILE_PATH))
    writeFileSync(CACHE_GITIGNORE_FILE_PATH, 'backup.json');

  if (!existsSync(CACHE_FILE_PATH))
    saveJson(CACHE_FILE_PATH, {});

  setInterval(this.backup.bind(this), 24e5);
  onExit(this.backup.bind(this));

  this.cache = require(CACHE_FILE_PATH);
}

Server.prototype.backup = function () {
  const { logger, cache } = this;
  return (
    logger.verbose('backup in progress...'),
    saveJson(CACHE_FILE_PATH, cache),
    logger.verbose('backup ok'),
    true
  );
};

Server.prototype.triggerBackup = function () {
  clearTimeout(this.backup_triggering_timeout_id);
  this.backup_triggering_timeout_id = setTimeout(this.backup.bind(this), 2**13);
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
  const { notification_channel } = this;

  const promises = [];

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