// author: rochdi nassah
// created: 2025/09/22

'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const http = require('node:http');
const parse_url = require('node:url').parse;
const Route = require('./_route');
const { SilentLogger } = require('../logger');

const DEFAULT_PING_INTERVAL = 3e4;

const http_server = http.createServer();

var pckt_id_counter = 0;

class Server extends WebSocketServer {
  constructor(opts = {}) {
    super({ server: http_server });

    const { port, ping_interval, logger } = opts;

    this.logger = logger || new SilentLogger();

    this.port = port;
    this.ping_interval = ping_interval ?? DEFAULT_PING_INTERVAL;
    this.http_server = http_server;

    this.routes = [];

    this.clients = new Map();
    this.clients_counter = 0;
    
    this.on('connection', this.onConnection);
    this.on('Pong', this.onPong);
    this.on('EchoRequestMessage', this.onEchoRequestMessage);
  }
}

for (const method of ['GET', 'POST', 'OPTIONS', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT']) {
  Server.prototype[method.toLowerCase()] = function (path, handler) {
    const { routes } = this;
    const route = new Route(method, path, handler);
    routes.push(route);
  };
}

Server.prototype.run = function () {
  return new Promise(resolve => {
    const { port, ping_interval, http_server, logger, onRequest, pingClients } = this;
    http_server.on('request', onRequest.bind(this)).listen(port, '::0', () => {
      logger.verbose('server listens on port:', port);
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
  for (const route of this._routes)
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
  const { t, d, i } = JSON.parse(data);
  client.emit(t, d, i);
  this.emit(t, client, d, i);
};

module.exports = Server;

WebSocket.prototype.sendMessage = function (t, d, cb) {
  const i = pckt_id_counter++;
  if (cb)
    this.once('Reply::'+i, cb);
  this.send(JSON.stringify({ t, d, i }));
};

WebSocket.prototype.ping = function () {
  this.resolved_ping = false;
  this.sendMessage('Ping');
};

WebSocket.prototype.reply = function (id, data) {
  this.sendMessage('Reply::'+id, data);
};

WebSocket.prototype.stop = function (reason, delay) {
  this.sendMessage('StopRequestMessage', { reason, delay });
};

WebSocket.prototype.restart = function (reason, delay) {
  this.sendMessage('RestartRequestMessage', { reason, delay });
};

Server.prototype.onEchoRequestMessage = function (client, data, id) {
  client.reply(id, { echo_value: data.value });
};