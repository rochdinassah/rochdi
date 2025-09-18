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

Http2Client.prototype.ensureSession = function (authority, opts = {}) {
  const { cipher, key } = opts;
  const { sessions } = this;

  let session = sessions.get(key ?? authority);
  if (!session || session.closed || session.destroyed || cipher !== session.cipher) {
    this.updateCipher(cipher);
    session = http2.connect(authority)
      .on('error', onsessionerror)
      .on('close', onsessionclose)
      .on('connect', onsessionconnect);
    this.resetCipher(cipher);

    session.cipher = cipher;
    session.key = key ?? authority;
    session.authority = authority;

    sessions.set(session.key,session);
  }
  return session;
};

Http2Client.prototype.createSession = function (authority, opts = {}) {
  const { cipher, key, keepalive } = opts;
  const { sessions } = this;

  this.updateCipher(cipher);
  const session = http2.connect(authority)
    .on('error', onsessionerror)
    .on('close', onsessionclose)
    .on('connect', onsessionconnect);
  this.resetCipher(cipher);

  session.cipher = cipher;
  session.authority = authority;
  session.keepalive = keepalive;

  sessions.set(key ?? authority, session);
};

Http2Client.prototype.destroy = function () {
  this.sessions.forEach(session => {
    session.destroy();
  });
};

Http2Client.prototype._request = function (method, urlString, opts = {}) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, path } = parseUrl(urlString);
    const { body, cipher, keepalive } = opts;

    let headers = { ...opts.headers };
    
    this._parseUserAgent(headers);

    const authority = protocol+'//'+hostname;

    const session = this.ensureSession(authority, { cipher });
    
    const stream = session.request({ ':method': method, ':path': path, ':path': path, ...headers });

    stream.on('error', this.onerror.bind(this, { resolve, reject }, arguments));
    stream.on('response', headers => {
      stream.statusCode = headers[':status'];
      stream.headers = headers;
      if (false === keepalive)
        session.close();
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
  clearInterval(this.pingIntervalId);
  // log('session close');
}

function onsessionconnect() {
  if (this.keepalive) {
    this.pingIntervalId = setInterval(pingsession.bind(this), 59e3);
  }
  // log('session connect:', this.authority);
}

const pingBuffer = Buffer.from('        ');
function pingsession() {
  this.ping(pingBuffer, (err, duration, payload) => {
    // log('pong!', duration);
  });
};