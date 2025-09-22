// author: rochdi nassah
// created: 2025/09/22

'use strict';

module.exports = Route;

function Route(method, path, handler) {
  this.method = method;
  this.path = path;
  this._handler = handler;

  this._parsePattern();
}

Route.prototype._parsePattern = function () {
  const path = this.path.trim('/');
  const regexp = /(\{[a-zA-Z0-9+-_/\\]+\})/g;
  const match = Array.from(regexp[Symbol.matchAll](path));
  if (match.length) {
    const paramKeys = this._paramKeys = match.map(m => m[1]);
    this._pattern = path;
    for (const paramKey of paramKeys) {
      this._pattern = this._pattern.replace(paramKey, '([a-zA-Z0-9-_]+)');
    }
    this._pattern = new RegExp(this._pattern);
  }
};

Route.prototype.run = function (req, res) {
  this._handler(req, res);
};

Route.prototype.match = function (path) {
  log(path, this._pattern);
  exit(this._pattern.exec(path));
  return this._pattern && this._pattern.exec(path);
};