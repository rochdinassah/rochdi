// author: rochdi nassah
// created: 2025/09/22

'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const http = require('node:http');
const parse_url = require('node:url').parse;
const Route = require('./_route');
const Logger = require('../logger');

const PING_INTERVAL = 8e3;

const http_server = http.createServer();

var seq = 0;

class Server extends WebSocketServer {
  constructor(opts = {}) {
    const { port } = opts;

    super({ server: http_server });

    this.logger = new Logger({ prefix: 'app-server' });
    this.port = port;
    this.http_server = http_server;

    this._routes = [];

    this.connections = new Map();
    this.connections_counter = 0;
    
    this.on('connection', this.onconnection);
    this.on('internal::pong', this[Symbol.for('internal::onpong')]);
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
  const { port, http_server, logger, onrequest } = this;
  http_server.on('request', onrequest.bind(this)).listen(port, '::0', () => logger.verbose('server listens on port:', port));
  setInterval(this[Symbol.for('internal::pingClients')].bind(this), PING_INTERVAL);
};

Server.prototype[Symbol.for('internal::pingClients')] = function () {
  const { connections } = this;
  connections.forEach(connection => {
    if (2*PING_INTERVAL < new Date()-connection.last_sent_pong)
      return connection.close(1009, 'unresponsive connection');
    connection[Symbol.for('internal::ping')]();
  });
};

Server.prototype[Symbol.for('internal::onpong')] = function (connection, data) {
  connection.last_sent_pong = new Date();
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
  connection.last_sent_pong = new Date();

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
  const { t, d, s } = JSON.parse(data);
  connection.emit(t, d, s);
  this.emit(t, connection, d, s);
};

module.exports = Server;

WebSocket.prototype.sendMessage = function (t, d, cb) {
  const s = seq++;
  if (cb)
    this.once('reply::'+s, cb);
  this.write({ t, d, s });
};

WebSocket.prototype[Symbol.for('internal::ping')] = function () {
  this.sendMessage('internal::ping');
};

WebSocket.prototype.reply = function (s, d) {
  this.sendMessage('reply::'+s, d);
};