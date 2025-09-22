// author: rochdi nassah
// created: 2025/09/22

'use strict';

const { WebSocketServer } = require('ws');
const http = require('node:http');

module.exports = Server;

const httpServer = http.createServer();

function Server(opts = {}) {
  const { port } = opts;

  this.port = port;
  this.httpServer = httpServer;

  this.on('connection', this.onconnection);
}

Server.prototype = new WebSocketServer({ server: httpServer });

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