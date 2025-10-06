// author: rochdi nassah
// created: 2025/09/22

'use strict';

const { WebSocketServer, WebSocket } = require('ws');
const http = require('node:http');
const parse_url = require('node:url').parse;
const Route = require('./_route');
const Logger = require('../logger');

const http_server = http.createServer();

class Server extends WebSocketServer {
  constructor(opts = {}) {
    const { port } = opts;

    super({ server: http_server });

    this.logger = new Logger({ prefix: 'app-server' });
    this.port = port;
    this.http_server = http_server;

    this._routes = [];

    this.connections = new Map();
    this.connection_counter = 0;
    
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
  const { port, http_server } = this;
  http_server.on('request', this.onrequest.bind(this)).listen(port, '::0', () => this.logger.verbose('server listens on port:', port));
};

Server.prototype.onrequest = function (req, res) {
  const { method, url } = req;
  const urlComponents = parse_url(url);
  const path = urlComponents.path.trim('/');
  for (const route of this._routes)
    if (method === route.method)
      if (route.match(path))
        return route.run(req, res);
  res.writeHead(404).end();
};

Server.prototype.onconnection = function (connection) {
  const { connections, logger } = this;

  connection.id = this.connection_counter++;
  connections.set(connection.id, connection);

  connection.on('close', this.ondisconnection.bind(this, connection));

  connection.send_message('ConnectionAcceptMessage', { a: 1 });

  logger.verbose('attach %d', connection.id);
};

Server.prototype.ondisconnection = function (connection, code, buff = 'unknown') {
  const { connections, logger } = this;
  connections.delete(connection.id);
  logger.verbose('detach %d | code: %d, reason: %s', connection.id, code, String(buff));
};

WebSocket.prototype.send_message = function (t, d) {
  this.write({ t, d });
};

module.exports = Server;