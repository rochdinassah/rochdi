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
  this.sessions = new Map();
}

Http2Client.prototype.ensueSession = function (authority, opts = {}) {

};

Http2Client.prototype._request = function (method, urlString, opts = {}) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, path } = parseUrl(urlString);
    const { body } = opts;

    let headers = { ...opts.headers };
    
    this._parseUserAgent(headers);

    const authority = protocol+'//'+hostname;

    const session = this.ensueSession(authority, { shared: true });

    const stream = session.request({ ':method': method, ':path': path, ':path': path, headers });

    stream.on('error', this.onerror.bind(this, { resolve, reject }, arguments));
    stream.on('response', headers => {
      stream.statusCode = headers[':status'];
      stream.headers = headers;
      this.onresponse({ resolve, reject }, stream);
    });

    if (body)
      stream.write('object' === typeof body ? JSON.stringify(body) : body);

    stream.end();
  });
};