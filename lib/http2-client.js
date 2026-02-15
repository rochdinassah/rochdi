// author: rochdi nassah

'use strict';

const Base = require('./http-client');
const http2 = require('node:http2');
const Logger = require('./logger');

module.exports = Http2Client;
module.exports.USER_AGENT = Base.USER_AGENT;

Http2Client.prototype = new Base();

function Http2Client(opts = {}) {
  const { logger, retry_on_error, timeout, ping_interval, user_agent, keepalive } = opts;

  this.logger = logger ?? new Logger.SilentLogger();
  this.retry_on_error = retry_on_error ?? this.retry_on_error;
  this.timeout = timeout;
  this.ping_interval = ping_interval ?? 1e4;
  this.user_agent = user_agent ?? this.user_agent;
  this.keepalive = keepalive ?? true;

  this.sessions = new Map();
}

Http2Client.prototype.ensureSession = function (authority, opts = {}) {
  const { cipher } = opts;
  const { sessions } = this;

  let session = sessions.get(authority);
  if (!session || session.closed || session.destroyed || cipher !== session.cipher) {
    this.updateCipher(cipher);
    this.resetCipher(cipher, void(session = http2.connect(authority)));

    session.on('error', onSessionError.bind(this, session));
    session.on('close', onSessionClose.bind(this, session));
    session.on('connect', onSessionConnect.bind(this, session));

    session.cipher = cipher;
    session.key = authority;
    session.authority = authority;

    sessions.set(session.key, session);
  }

  return session.ready ? Promise.resolve(session) : this.awaitSession(authority);
};

Http2Client.prototype.ensureSessions = function (authorities) {
  return Promise.all(authorities.map(this.ensureSession.bind(this)));
};

Http2Client.prototype.awaitSession = function (authority) {
  return new Promise(resolve => this.once('SessionConnect::'+authority, resolve));
};

Http2Client.prototype.destroy = function () {
  this.sessions.forEach(session => {
    session.destroy();
  });
};

Http2Client.prototype._request = function (method, url_string, opts = {}) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, pathname, search } = new URL(url_string);
    const { body, cipher, keepalive } = opts;

    const path = pathname+search;

    let headers = { ...opts.headers };
    
    this._parseUserAgent(headers);
    
    const authority = protocol+'//'+hostname;

    this.ensureSession(authority, { cipher }).then(session => {
      const stream = session.request({ ':method': method, ':path': path, ...headers });
      
      const failure_timeout_id = setTimeout(stream.emit.bind(stream), 2**10, 'failed');
      stream.on('error', stream.emit.bind(stream, 'failed'));
      stream.once('failed', this.onError.bind(this, { resolve, reject }, arguments, session));
      stream.on('response', () => clearTimeout(failure_timeout_id));

      stream.on('response', headers => {
        stream.statusCode = headers[':status'];
        stream.headers = headers;
        this.onResponse({ resolve, reject }, stream);
      });
      
      const timeout = opts.timeout ?? this.timeout;
      
      if (timeout)
        stream.on('timeout', () => (stream.close(), reject('timeout'))).setTimeout(timeout);

      if (body)
        stream.write('object' === typeof body && !(body instanceof Buffer) ? JSON.stringify(body) : body);

      stream.end();
    });
  });
};

Http2Client.prototype.onError = function(promise, args, session, err) {
  const retry_on_error = args[2].retry_on_error ?? this.retry_on_error;
  if (!retry_on_error)
    return promise.reject('request error: '+err.code);

  const { logger } = this;
  const { ready, closed, destroyed, authority } = session;

  logger.warn('request error, retrying...');
  
  if (!ready || closed || destroyed) {
    this.awaitSession(authority).then(() => promise.resolve(this._request(...args)));
  } else {
    asyncDelay(rand(2**10, 2**12)).then(() => promise.resolve(this._request(...args)));
  }
}

function onSessionError(session, err) {
  this.logger.error('session error:', err.code);
}

function onSessionClose(session) {
  const { logger, keepalive } = this;
  const { ctime, ping_interval_id, authority } = session;

  session.ready = false;

  clearInterval(ping_interval_id);
  logger.debug('session close: %s', formatDuration(new Date()-(ctime ?? new Date()-1)));

  if (keepalive) {
    logger.debug('reconnection in %s', formatDuration(2**11));
    asyncDelay(2**11).then(() => {
      this.ensureSession(authority);
    });
  }
}

function onSessionConnect(session) {
  const { authority } = session;
  const { logger } = this;

  session.ping_interval_id = setInterval(pingsession.bind(session, this), this.ping_interval);
  session.ctime = new Date();
  session.ready = true;

  logger.debug('session connect:', authority);
  this.emit('SessionConnect::'+authority, session);
}

const ping_buff = Buffer.from('        ');
function pingsession(manager) {
  manager.logger.debug('session ping sent!');
  const timeout = setTimeout(this.destroy.bind(this), 2**10);
  this.ping(ping_buff, () => clearTimeout(timeout));
};