// author: rochdi nassah
// created: 2025/09/22

'use strict';

const { WebSocketServer } = require('ws');
const http = require('node:http');
const parseUrl = require('node:url').parse;
const Route = require('./_route');

module.exports = Server;

const httpServer = http.createServer();

Server.prototype = new WebSocketServer({ server: httpServer });

function Server(opts = {}) {
  const { port } = opts;

  this.port = port;
  this.httpServer = httpServer;
  this._routes = [];

  this.on('connection', this.onconnection);
}

for (const method of ['GET', 'POST', 'OPTIONS', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT']) {
  Server.prototype[method.toLowerCase()] = function (path, handler) {
    const { _routes } = this;
    const route = new Route(method, path, handler);
    _routes.push(route);
  };
}

Server.prototype.run = function () {
  const { port, httpServer } = this;
  httpServer.on('request', this.onrequest.bind(this)).listen(port, () => log('server listens on port:', port));
};

Server.prototype.onrequest = function (req, res) {
  const { method, url } = req;
  const urlComponents = parseUrl(url);
  const path = urlComponents.path.trim('/');
  for (const route of this._routes)
    if (method === route.method)
      if (route.match(path))
        return route.run(req, res);
  res.writeHead(404);
  res.end();
};

Server.prototype.onconnection = function (client) {
  log('recv connection');

  client.on('close', this.ondisconnection.bind(this, client));
};

Server.prototype.ondisconnection = function (client, code, buff) {
  log('recb disconnection', code, String(buff));
};