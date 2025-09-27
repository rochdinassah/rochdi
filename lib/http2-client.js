// author: rochdi nassah
// created: 2025/09/18

'use strict';

const Base = require('./http-client');
const http2 = require('node:http2');
const parseUrl = require('node:url').parse;
const Logger = require('./logger');

module.exports = Http2Client;

Http2Client.prototype = new Base();

function Http2Client(opts = {}) {
  this.logger = opts.logger ?? new Logger({ prefix: 'http-client' });
  this.retryOnError = opts.retryOnError ?? this.retryOnError;
  this.userAgent = opts.userAgent ?? this.userAgent;
  this.sessions = new Map();
}

Http2Client.prototype.ensureSession = function (authority, opts = {}) {
  const { cipher, key } = opts;
  const { sessions } = this;

  let session = sessions.get(key ?? authority);
  if (!session || session.closed || session.destroyed || (void 0 === key && cipher !== session.cipher)) {
    this.updateCipher(cipher);
    session = http2.connect(authority);
    session
      .on('error', onsessionerror.bind(this, session))
      .on('close', onsessionclose.bind(this, session))
      .on('connect', onsessionconnect.bind(this, session));
    this.resetCipher(cipher);

    session.cipher = cipher;
    session.key = key ?? authority;
    session.authority = authority;

    sessions.set(session.key, session);
  }
  return session;
};

Http2Client.prototype.createSession = function (authority, opts = {}) {
  const { cipher, key, keepalive } = opts;
  const { sessions } = this;

  this.updateCipher(cipher);
  const session = http2.connect(authority);

  session
    .on('error', onsessionerror.bind(this, session))
    .on('close', onsessionclose.bind(this, session))
    .on('connect', onsessionconnect.bind(this, session));
  this.resetCipher(cipher);

  session.cipher = cipher;
  session.authority = authority;
  session.keepalive = keepalive;

  return sessions.set(key ?? authority, session), key;
};

Http2Client.prototype.createSessionAsync = function (authority, opts = {}) {
  return new Promise(resolve => this.createSession(authority, opts).on('connect', resolve));
};

Http2Client.prototype.destroy = function () {
  this.sessions.forEach(session => {
    session.destroy();
  });
};

Http2Client.prototype._request = function (method, urlString, opts = {}) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, path } = parseUrl(urlString);
    const { body, cipher, sessionKey, keepalive } = opts;

    let headers = { ...opts.headers };
    
    this._parseUserAgent(headers);

    const authority = protocol+'//'+hostname;

    const session = this.ensureSession(authority, { cipher, key: sessionKey });
    
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

function onsessionerror(session, err) {
  this.logger.error('session error:', err.code);
}

function onsessionclose(session) {
  clearInterval(session.pingIntervalId);
  this.logger.debug('session close');
}

function onsessionconnect(session) {
  if (session.keepalive) {
    session.pingIntervalId = setInterval(pingsession.bind(session), 59e3);
  }
  this.logger.debug('session connect:', session.authority);
}

const pingBuffer = Buffer.from('        ');
function pingsession() {
  this.ping(pingBuffer, noop);
};