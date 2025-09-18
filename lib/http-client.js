// author: rochdi nassah
// created: 2025/09/18

'use strict';

module.exports = HttpClient;

function HttpClient() {}

for (const method of ['GET', 'POST', 'OPTIONS', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT']) {
  HttpClient.prototype[method.toLowerCase()] = function (urlString, opts = {}) {
    return arguments;
  };
}