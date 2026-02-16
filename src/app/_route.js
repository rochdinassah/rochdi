// author: rochdi nassah

'use strict';

module.exports = Route;

function Route(method, path, handler) {
  this.method = method;
  this.path = path;
  this.handler = handler;
  this.params = {};
  this.parsePattern();
}

Route.prototype.parsePattern = function () {
  const path = this.pattern = this.path.trim('/');
  const regexp = /\{([a-zA-Z0-9+-_/\\]+)\}/g;
  const match = Array.from(regexp[Symbol.matchAll](path));
  if (match.length) {
    const param_keys = this.param_keys = match.map(m => m[1]);
    for (const param_key of param_keys)
      this.pattern = this.pattern.replace('{'+param_key+'}', '(.*)');
  }
  this.pattern = new RegExp(`^${this.pattern}$`);
};

Route.prototype.run = function (app, req, res) {
  const data_buff = [];
  req.on('data', data_buff.push.bind(data_buff));
  req.on('end', () => {
    let data = String(Buffer.concat(data_buff));

    try {
      data = JSON.parse(data);
    } catch {}

    req.data = data;
    req.params = this.params;

    this.handler.call(app, req, res);
  });
};

Route.prototype.match = function (path) {
  if (this.pattern) {
    const match = this.pattern.exec(path);
    if (match) {
      const param_values = match.slice(1);
      const { params, param_keys } = this;
      for (let i = 0; param_values.length > i; ++i)
        params[param_keys[i]] = param_values[i];
      return true;
    }
  }
  return false;
};