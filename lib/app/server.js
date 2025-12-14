// author: rochdi nassah
// created: 2025/09/22

'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const http = require('node:http');
const parse_url = require('node:url').parse;
const Route = require('./_route');
const { SilentLogger } = require('../logger');

const DEFAULT_PING_INTERVAL = 3e4;

class Server extends WebSocketServer {
  constructor(opts = {}) {
    const http_server = http.createServer();

    super({ server: http_server, clientTracking: false });

    const { port, ping_interval, logger } = opts;

    this.logger = logger || new SilentLogger();

    this.port = port;
    this.ping_interval = ping_interval ?? DEFAULT_PING_INTERVAL;
    this.http_server = http_server;

    this.routes = [];
    this.exit_callbacks = []; 

    this.clients = new Map();
    this.clients_counter = 0;

    this.clients.add = noop;

    this[Symbol.for('init')]();

    this.on('connection', this.onConnection);
    this.on('Pong', this.onPong);
    this.on('EchoRequestMessage', this.onEchoRequestMessage);
  }
}

Server.prototype[Symbol.for('init')] = function () {
  const signals = ['INT', 'HUP', 'TERM', 'QUIT', 'USR1', 'USR2'];
  for (const signal of signals)
    process.on('SIG'+signal, this.onProcessExit.bind(this));
};

Server.prototype.onExit = function (cb) {
  this.exit_callbacks.push(cb);
};

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
    const { port, ping_interval, http_server, logger, onRequest, pingClients } = this;
    http_server.on('request', onRequest.bind(this)).listen(port, '::0', () => {
      resolve();
    });
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

Server.prototype.onPong = function (client, data) {
  client.resolved_ping = true;
};

Server.prototype.onRequest = function (req, res) {
  const { method, url } = req;
  const url_components = parse_url(url);
  const path = url_components.path.trim('/');
  for (const route of this.routes)
    if (method === route.method)
      if (route.match(path))
        return route.run(req, res);
  res.writeHead(404).end();
};

Server.prototype.onConnection = function (client) {
  const { clients, logger, onDisconnection, onConnectionMessage } = this;

  client.id = this.clients_counter++;
  client.resolved_ping = 'n/a';
  client.alive = true;

  clients.set(client.id, client);

  client.on('error', noop);
  client.on('close', onDisconnection.bind(this, client));
  client.on('message', onConnectionMessage.bind(this, client));

  this.emit('Attach', client);
};

Server.prototype.onDisconnection = function (client, code, buff) {
  const { clients, logger } = this;

  client.alive = false;
  client.emit('Detach');

  clients.delete(client.id);

  this.emit('Detach', client);
};

Server.prototype.onConnectionMessage = function (client, data) {
  const { t, d, s } = JSON.parse(data);
  client.emit(t, d, s);
  this.emit(t, client, d, s);
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

Server.prototype.onProcessExit = async function (signal, code) {
  const { exit_callbacks } = this;
  for (const cb of exit_callbacks)
    await cb();
  // process.exit(code);
};

Server.prototype.onEchoRequestMessage = function (client, data) {
  client.reply(data.seq, { echo_value: data.value });
  client.sendMessage('EchoRequestMessage', { value: randomString(4) }, reply => {
    log('client reply:', reply);
  });
};