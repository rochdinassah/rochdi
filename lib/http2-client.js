'use strict';

const log = console.log.bind(console);

const http2 = require('node:http2');
const urlParser = require('node:url').parse;
const HttpClient = require('./http-client');

module.exports = Http2Client;

function Http2Client(opts = {}) {
  const { retryOnError, userAgent } = opts;

  this.retryOnError = retryOnError ?? true;
  this.userAgent = userAgent;

  this.sessions = new Map();
  this.sessionCounter = 0;
}

Http2Client.prototype = new HttpClient();

Http2Client.prototype.createSession = function (authority, cipher, key, keepalive) {
  const { sessions } = this;

  this.setCipher(cipher);

  const session = http2.connect(authority)
    .on('error', onsessionerror)
    .on('close', onsessionclose)
    .on('connect', onsessionconnect);

  this.resetCipher();

  if (void 0 === key) {
    key = this.sessionCounter++;
  }

  session.key = key;
  session.authority = authority;
  session.cipher = cipher;
  session.keepalive = keepalive;

  return sessions.set(key, session), log('session created(%s)', 'number' === typeof key ? 'manual' : 'global'), session;
};

Http2Client.prototype.createSessionAsync = function () {
  return new Promise(resolve => {
    this.createSession(...arguments).on('connect', function () {
      resolve(this);
    });
  });
};

Http2Client.prototype.createSessions = function (endpoints) {
  return endpoints.map(e => this.createSession(e.authority, e.cipher, e.authority, true));
};

Http2Client.prototype.createSessionsAsync = function (endpoints) {
  return Promise.all(this.createSessions(endpoints).map(session => new Promise(resolve => session.on('connect', () => resolve(session)))));
};

Http2Client.prototype.ensureSession = function (session, cipher) {
  if ('object' === typeof session) {
    const { key, authority, cipher, keepalive, destroyed, closed } = session;
    return closed || destroyed ? this.createSession(authority, cipher, key, keepalive) : session;
  }

  const authority = session;

  session = this.sessions.get(authority);

  if (
    !session ||
    session.cipher !== cipher ||
    session.closed ||
    session.destroyed
  ) {
    return this.createSession(authority, cipher, authority);
  }

  return session;
};

Http2Client.prototype.destroy = function () {
  const { sessions } = this;
  for (const session of sessions.values()) {
    session.destroy();
  }
  sessions.clear();
};

Http2Client.prototype._request = function (method, urlString, opts = {}) { 
  const { body, cipher } = opts;
  const { protocol, host, path } = urlParser(urlString);
  const { userAgent } = this;

  const headers = { ...opts.headers };
  this.parseUserAgent(headers);
  
  const authority = protocol+'//'+host;
  const options = { ':scheme': 'https', ':method': method, ':path': path, ...headers };

  const session = opts.session || this.ensureSession(authority, cipher);

  let rr;
  const promise = new Promise((resolve, reject) => rr = { resolve, reject });

  const stream = session.request(options)
    .on('error', this.onerror.bind(this, arguments, rr))
    .on('response', headers => this.onresponse(headers, stream, rr));

  if (body)
    stream.write('object' === typeof body ? JSON.stringify(body) : body);

  return stream.end(), promise;
};

function onsessionerror(error) {
  log('session error(%s), %s', this.key, error.code);
}
function onsessionclose() {
  log('session close(%s)', this.key);
  clearInterval(this.pingIntervalId);
}
function onsessionconnect() {
  log('session connect ok(%s)', this.key);
  if (this.keepalive) {
    this.pingIntervalId = setInterval(pingsession.bind(this), 59e3);
  }
}

const pingBuffer = Buffer.from('pingpong');
const noop = Function.prototype;
function pingsession() {
  log('ping sent');
  return this.ping(pingBuffer, noop);
}