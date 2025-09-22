// author: rochdi nassah
// created: 2025/09/22

'use strict';

const { WebSocketServer } = require('ws');
const http = require('node:http');

module.exports = Server;

const httpServer = http.createServer();

function Server() {
  this.httpServer = httpServer;
}

Server.prototype = new WebSocketServer({ server: httpServer });

Server.prototype.run = function (port) {
  this.httpServer.listen(port, () => log('server listens on port:', port));
};