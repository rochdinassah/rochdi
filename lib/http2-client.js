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
  const { cipher, key } = opts;
  const { sessions } = this;
  let session = sessions.get(key ?? authority);
  if (!session || session.closed || session.destroyed || cipher !== session.cipher) {
    session = http2.connect(authority)
      .on('error', this.onsessionerror)
      .on('close', this.onsessionclose)
      .on('connect', this.onsessionconnect);

    session.cipher = cipher;
    session.key = key ?? authority;
    sessions.set(session.key,session);
  }
  return session;
};

Http2Client.prototype._request = function (method, urlString, opts = {}) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, path } = parseUrl(urlString);
    const { body } = opts;

    let headers = { ...opts.headers };
    
    this._parseUserAgent(headers);

    const authority = protocol+'//'+hostname;

    const session = this.ensueSession(authority, { cipher });

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

function onsessionerror(err) {
  log('session error:', err.code);
}

function onsessionclose() {
  log('session close');
}

function onsessionconnect() {
  log('session connect:', this.authority);
}