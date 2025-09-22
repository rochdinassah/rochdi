// author: rochdi nassah
// created: 2025/09/22

'use strict';

const { WebSocketServer } = require('ws');
const http = require('node:http');

module.exports = Server;

const httpServer = http.createServer();

Server.prototype = new WebSocketServer({ server: httpServer });

function Server(opts = {}) {
  const { port } = opts;

  this.port = port;
  this.httpServer = httpServer;
  this._routes = new Map();

  this.on('connection', this.onconnection);
}

for (const method of ['GET', 'POST', 'OPTIONS', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT']) {
  Server.prototype[method.toLowerCase()] = function (path, handler) {
    const { _routes } = this;
    if (_routes.has(path))
      throw new Error('path "'+path+'" is already set');
    _routes.set(path, handler);
  };
}

Server.prototype.run = function () {
  const { port, httpServer } = this;
  httpServer.listen(port, () => log('server listens on port:', port));
};

Server.prototype.onconnection = function (client) {
  log('recv connection');

  client.on('close', this.ondisconnection.bind(this, client));
};

Server.prototype.ondisconnection = function (client, code, buff) {
  log('recb disconnection', code, String(buff));
};