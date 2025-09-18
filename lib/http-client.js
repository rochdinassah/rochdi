// author: rochdi nassah
// created: 2025/09/18

'use strict';

const http = require('node:http');
const https = require('node:https');
const parseUrl = require('node:url').parse;

module.exports = HttpClient;

function HttpClient() {}

for (const method of ['GET', 'POST', 'OPTIONS', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT']) {
  HttpClient.prototype[method.toLowerCase()] = function (urlString, opts = {}) {
    return this._request(method, urlString, opts);
  };
}

HttpClient.prototype._request = function (method, urlString, opts = {}) {
  return arguments;
};