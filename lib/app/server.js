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

    this._routes = [];

    this.connections = new Map();
    this.connections_counter = 0;
    
    this.on('connection', this.onconnection);
    this.on('internal::pong', this[Symbol.for('internal::onpong')]);
    this.on('EchoRequestMessage', this.onEchoRequestMessage);
  }
}

for (const method of ['GET', 'POST', 'OPTIONS', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT']) {
  Server.prototype[method.toLowerCase()] = function (path, handler) {
    const { _routes } = this;
    const route = new Route(method, path, handler);
    _routes.push(route);
  };
}

Server.prototype.run = function () {
  return new Promise(resolve => {
    const { port, ping_interval, http_server, logger, onrequest } = this;
    http_server.on('request', onrequest.bind(this)).listen(port, '::0', () => {
      logger.verbose('server listens on port:', port);
      resolve();
    });
    this.ping_interval_id = setInterval(this[Symbol.for('internal::pingClients')].bind(this), ping_interval);
  });
};

Server.prototype.close = function () {
  return new Promise(resolve => {
    const { http_server, ping_interval_id } = this;
    clearInterval(this.ping_interval_id);
    http_server.close(resolve);
  });
};

Server.prototype[Symbol.for('internal::pingClients')] = function () {
  const { connections } = this;
  connections.forEach(connection => {
    if (!connection.resolved_ping)
      return connection.close(1009, 'unresponsive connection');
    connection[Symbol.for('internal::ping')]();
  });
};

Server.prototype[Symbol.for('internal::onpong')] = function (connection, data) {
  connection.resolved_ping = true;
};

Server.prototype.onrequest = function (req, res) {
  const { method, url } = req;
  const url_components = parse_url(url);
  const path = url_components.path.trim('/');
  for (const route of this._routes)
    if (method === route.method)
      if (route.match(path))
        return route.run(req, res);
  res.writeHead(404).end();
};

Server.prototype.onconnection = function (connection) {
  const { connections, logger } = this;

  connection.id = this.connections_counter++;
  connection.resolved_ping = 'n/a';

  connections.set(connection.id, connection);

  connection.on('close', this.ondisconnection.bind(this, connection));
  connection.on('message', this.onconnectionmessage.bind(this, connection));

  logger.verbose('attach %d', connection.id);
  this.emit('attach', connection);
};

Server.prototype.ondisconnection = function (connection, code, buff) {
  buff = String(buff);

  const { connections, logger } = this;

  connections.delete(connection.id);
  logger.verbose('detach %d | code: %d, reason: %s', connection.id, code, !buff.length ? 'unknown' : buff);
  this.emit('detach', connection);
};

Server.prototype.onconnectionmessage = function (connection, data) {
  const { t, d, i } = JSON.parse(data);
  connection.emit(t, d, i);
  this.emit(t, connection, d, i);
};

module.exports = Server;

WebSocket.prototype.sendMessage = function (t, d, cb) {
  const i = pckt_id_counter++;
  if (cb)
    this.once('reply::'+i, cb);
  this.write({ t, d, i });
};

WebSocket.prototype[Symbol.for('internal::ping')] = function () {
  this.resolved_ping = false;
  this.sendMessage('internal::ping');
};

WebSocket.prototype.reply = function (id, data) {
  this.sendMessage('reply::'+id, data);
};

Server.prototype.onEchoRequestMessage = function (connection, data, id) {
  connection.reply(id, { echo_value: data.value });
};