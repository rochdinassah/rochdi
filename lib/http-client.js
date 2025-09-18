// author: rochdi nassah
// created: 2025/09/18

'use strict';

const log = console.log;

const http = require('node:http');
const https = require('node:https');
const parseUrl = require('node:url').parse;

module.exports = HttpClient;

function HttpClient(opts = {}) {
  this.retryOnError = opts.retryOnError ?? true;
}

for (const method of ['GET', 'POST', 'OPTIONS', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT']) {
  HttpClient.prototype[method.toLowerCase()] = function (urlString, opts = {}) {
    return this._request(method, urlString, opts);
  };
}

HttpClient.prototype._request = function (method, urlString, opts = {}) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, path } = parseUrl(urlString);

    const req = ('https:' === protocol ? https : http)
      .request({ method, hostname, path })
      .on('error', this.onerror.bind(this, { resolve, reject }, arguments))
      .on('response', this.onresponse.bind(this, { resolve, reject }));

    req.end();
    return resolve(req);
  });
};

HttpClient.prototype.onerror = function (promise, args, err) {
  if (this.retryOnError) {
    // resolve(this._request(...args));
    exit(args);
  }
  // log(this.retryOnError);
  log(promise);
};

HttpClient.prototype.onresponse = function (res) {
  // exit('response', res);
};