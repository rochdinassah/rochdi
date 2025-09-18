// author: rochdi nassah
// created: 2025/09/18

'use strict';

const Base = require('./http-client');
const http2 = require('node:http2');

module.exports = Http2Client;

Http2Client.prototype = new Base();

function Http2Client(opts = {}) {
  this.retryOnError = opts.retryOnError ?? this.retryOnError;
  this.userAgent = opts.userAgent ?? this.userAgent;
}

Http2Client.prototype._request = function (method, urlString, opts = {}) {
  
};