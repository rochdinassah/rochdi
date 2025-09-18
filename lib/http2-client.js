// author: rochdi nassah
// created: 2025/09/18

'use strict';

const Base = require('./http-client');
const http2 = require('node:http2');
const parseUrl = require('node:url').parse;

module.exports = Http2Client;

Http2Client.prototype = new Base();

function Http2Client(opts = {}) {
  this.retryOnError = opts.retryOnError ?? this.retryOnError;
  this.userAgent = opts.userAgent ?? this.userAgent;
}

Http2Client.prototype._request = function (method, urlString, opts = {}) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, path } = parseUrl(urlString);
    let headers = { ...opts.headers };

    this._parseUserAgent(headers);

    exit(headers);

    const authority = protocol+'//'+hostname;

    const session = http2.connect(authority);

    const stream = session.request({  })

    exit(protocol, hostname, path);
  });
};