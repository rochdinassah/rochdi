// author: rochdi nassah
// created: 2025/09/22

'use strict';

module.exports = Route;

function Route(method, path, handler) {
  this.method = method;
  this.path = path;
  this._handler = handler;
  this._params = {};
  this._parsePattern();
}

Route.prototype._parsePattern = function () {
  const path = this._pattern = this.path.trim('/');
  const regexp = /\{([a-zA-Z0-9+-_/\\]+)\}/g;
  const match = Array.from(regexp[Symbol.matchAll](path));
  if (match.length) {
    const paramKeys = this._paramKeys = match.map(m => m[1]);
    for (const paramKey of paramKeys) {
      this._pattern = this._pattern.replace('{'+paramKey+'}', '([a-zA-Z0-9-_]+)');
    }
  }
  this._pattern = new RegExp(`^${this._pattern}$`);
};

Route.prototype.run = function (req, res) {
  req.params = this._params;
  this._handler(req, res);
};

Route.prototype.match = function (path) {
  if (this._pattern) {
    const match = this._pattern.exec(path);
    if (match) {
      const paramValues = match.slice(1);
      const { _params, _paramKeys } = this;
      for (let i = 0; paramValues.length > i; ++i) {
        _params[_paramKeys[i]] = paramValues[i];
      }
      return true;
    }
  }
  return false;
};