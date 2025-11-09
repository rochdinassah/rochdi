// author: rochdi nassah
// created: 2025/09/22

'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const http = require('node:http');
const parse_url = require('node:url').parse;
const Route = require('./_route');
const Logger = require('../logger');

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
  http_server.on('request', onrequest.bind(this)).listen(port, '0.0.0.0', () => logger.verbose('server listens on port:', port));

  setInterval(() => {
    this.connections.forEach(connection => {
      if (!connection.alive)
        return connection.close(1001, 'connection is dead from the client side');
      connection.alive = false;
      connection.send_message('_ping');
    });
  }, 3e4);
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
  connection.alive = true;
  connections.set(connection.id, connection);

  connection.on('close', this.ondisconnection.bind(this, connection));
  connection.on('message', this.onconnectionmessage.bind(this, connection));

  logger.verbose('attach %d', connection.id);
  this.emit('attach', connection);

  logger.error('connections size:', connections.size);
};

Server.prototype.ondisconnection = function (connection, code, buff = 'unknown') {
  const { connections, logger } = this;
  connections.delete(connection.id);
  logger.verbose('detach %d | code: %d, reason: %s', connection.id, code, String(buff));
  this.emit('detach', connection);
};

Server.prototype.onconnectionmessage = function (connection, data) {
  const { t, d, s } = JSON.parse(String(data));
  connection.alive = true;
  connection.emit(t, d, s);
  this.emit(t, connection, d, s);
};

module.exports = Server;

WebSocket.prototype.send_message = function (t, d, cb) {
  const s = seq++;
  if (cb)
    this.once('reply::'+s, cb);
  this.write({ t, d, s });
};

WebSocket.prototype.reply = function (s, d) {
  this.send_message('reply::'+s, d);
};