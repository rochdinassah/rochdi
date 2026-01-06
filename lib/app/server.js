// author: rochdi nassah
// created: 2025/09/22

'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const http = require('node:http');
const parse_url = require('node:url').parse;
const Route = require('./_route');
const { SilentLogger } = require('../logger');
const StateManager = require('../manager/state');

class Server extends WebSocketServer {
  constructor(opts = {}) {
    const http_server = http.createServer();

    super({ server: http_server, clientTracking: false });

    const { port, ping_interval, logger } = opts;

    this.logger = logger || new SilentLogger();

    this.port = port;
    this.ping_interval = ping_interval ?? 3e4;
    this.http_server = http_server;

    this.routes = [];

    this.clients = new Map();
    this.clients_counter = 0;

    this.clients.add = noop;

    this.state_manager = new StateManager();

    this.on('connection', this[Symbol.for('onConnection')]);
    this.on('Pong', this.onPong);
    this.on('EchoRequestMessage', this.onEchoRequestMessage);
  }
}

for (const method of ['GET', 'POST', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT']) {    
  Server.prototype[method.toLowerCase()] = function (path, handler) {
    return this.registerRoute(method, path, handler);
  };
}

Server.prototype.registerRoute = function (method, path, handler) {
  this.routes.push(new Route(method.toUpperCase(), path, handler));
};

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
  const url_components = parse_url(url);
  const path = url_components.path.trim('/');
  for (const route of this.routes)
    if (method === route.method)
      if (route.match(path))
        return route.run(req, res);
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

module.exports = Server;

WebSocket.prototype.seq = 0;

WebSocket.prototype.sendMessage = function (type, data = {}, cb) {
  const seq = data.seq = this.seq++;
  if (cb)
    this.once('Reply::'+seq, cb);
  this.send(JSON.stringify({ t: type, d: data }));
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

Server.prototype.onEchoRequestMessage = function (client, data) {
  client.reply(data.seq, { echo_value: data.value });
  client.sendMessage('EchoRequestMessage', { value: randomString(4) }, reply => {
    log('client reply:', reply);
  });
};