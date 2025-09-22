// author: rochdi nassah
// created: 2025/09/22

'use strict';

module.exports = Route;

function Route(method, path, handler) {
  this.method = method;
  this.path = path;
  this.handler = handler;
}

Route.prototype.run = function (req, res) {
  
};

Route.prototype.match = function (path) {
  path+='/';
  log(path.trim('/'));
  return true;
};