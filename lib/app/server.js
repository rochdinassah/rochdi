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

    this._seq = 0;
    this._routes = [];

    this.connections = new Map();
    this.connection_counter = 0;
    
    this.on('connection', this.onconnection);
    this.on('SynMessage', this.onSynMessage);
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
  connection.on('message', this.onconnectionmessage.bind(this, connection));

  connection.send_message('SettingsMessage', { a: 1, b: 2, c: 3, d: 4 });

  logger.verbose('attach %d', connection.id);
  this.emit('attach', connection);
};

Server.prototype.ondisconnection = function (connection, code, buff = 'unknown') {
  const { connections, logger } = this;
  connections.delete(connection.id);
  logger.verbose('detach %d | code: %d, reason: %s', connection.id, code, String(buff));
  this.emit('detach', connection);
};

Server.prototype.onconnectionmessage = function (connection, data) {
  const { t, d, s } = JSON.parse(String(data));
  this.emit(t, connection, d, s);
};

Server.prototype.onSynMessage = function (client, data, seq) {
  log('recv syn', data);
  client.reply(seq, { ack: data.val });
};

module.exports = Server;

WebSocket.prototype.send_message = function (t, d, cb) {
  const s = this._seq++;
  if (cb)
    this.once('reply::'+s, cb);
  this.write({ t, d, s });
};

WebSocket.prototype.reply = function (s, d) {
  this.send_message('reply::'+s, d);
};