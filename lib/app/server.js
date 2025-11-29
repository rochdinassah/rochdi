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

    this.connections = new Map();
    this.connections_counter = 0;
    
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
  const { connections } = this;
  connections.forEach(connection => {
    if (!connection.resolved_ping)
      return connection.close(1009, 'unresponsive connection');
    connection.ping();
  });
};

Server.prototype.onPong = function (connection, data) {
  connection.resolved_ping = true;
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

Server.prototype.onConnection = function (connection) {
  const { connections, logger, onDisconnection, onConnectionMessage } = this;

  connection.id = this.connections_counter++;
  connection.resolved_ping = 'n/a';

  connections.set(connection.id, connection);

  connection.on('close', onDisconnection.bind(this, connection));
  connection.on('message', onConnectionMessage.bind(this, connection));

  logger.verbose('attach %d', connection.id);
  this.emit('Attach', connection);
};

Server.prototype.onDisconnection = function (connection, code, buff) {
  const { connections, logger } = this;
  connections.delete(connection.id);
  logger.verbose('detach %d | code: %d, reason: %s', connection.id, code, !buff.length ? 'unknown' : buff);
  this.emit('Detach', connection);
};

Server.prototype.onConnectionMessage = function (connection, data) {
  const { t, d, i } = JSON.parse(data);
  connection.emit(t, d, i);
  this.emit(t, connection, d, i);
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

Server.prototype.onEchoRequestMessage = function (connection, data, id) {
  connection.reply(id, { echo_value: data.value });
};