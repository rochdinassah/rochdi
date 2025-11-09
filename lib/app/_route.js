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
    const param_keys = this._param_keys = match.map(m => m[1]);
    for (const param_key of param_keys)
      this._pattern = this._pattern.replace('{'+param_key+'}', '(.*)');
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
      const param_values = match.slice(1);
      const { _params, _param_keys } = this;
      for (let i = 0; param_values.length > i; ++i)
        _params[_param_keys[i]] = param_values[i];
      return true;
    }
  }
  return false;
};