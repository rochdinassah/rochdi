// author: rochdi nassah
// created: 2025/09/22

'use strict';

const { WebSocketServer } = require('ws');
const http = require('node:http');

module.exports = Server;

const httpServer = http.createServer();

function Server() {
  this.httpServer = httpServer;

  setImmediate(() => {
    this.emit('event', { a: randomString(16, { extra: '!~_@#$(' }) });
  });

  this.on('connection', this.onconnection);
}

Server.prototype = new WebSocketServer({ server: httpServer });

Server.prototype.run = function (port) {
  this.httpServer.listen(port, () => log('server listens on port:', port));
};

Server.prototype.onconnection = function (client) {
  log('recv connection');

  client.on('close', this.ondisconnection.bind(this, client));
};

Server.prototype.ondisconnection = function (client, code, buff) {
  log('recb disconnection', code, String(buff));
};