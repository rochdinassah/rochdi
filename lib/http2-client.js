// author: rochdi nassah

'use strict';

const Base = require('./http-client');
const http2 = require('node:http2');
const Logger = require('./logger');

const PING_BUFF = Buffer.from('        ');

class Http2Client extends Base {
  constructor(opts = {}) {
    super();

    const { logger, retry_on_error, timeout, ping_interval, user_agent, keepalive } = opts;

    this.logger = logger ?? new Logger.SilentLogger();
    this.retry_on_error = retry_on_error ?? this.retry_on_error;
    this.timeout = timeout;
    this.ping_interval = ping_interval ?? 59e3;
    this.user_agent = user_agent ?? this.user_agent;
    this.keepalive = keepalive ?? true;

    this.sessions = new Map();
  }

  destroy() {
    for (const session of this.sessions.values())
      session.destroy();
  }

  ensureSession(authority, opts = {}) {
    const { cipher } = opts;
    const { sessions } = this;

    let session = sessions.get(authority);
    if (!session || session.closed || session.destroyed || cipher !== session.cipher) {
      this.updateCipher(cipher);
      this.resetCipher(cipher, void(session = http2.connect(authority)));

      session.on('error', this.onSessionError.bind(this, session));
      session.on('close', this.onSessionClose.bind(this, session));
      session.on('connect', this.onSessionConnect.bind(this, session));

      session.cipher = cipher;
      session.key = authority;
      session.authority = authority;

      sessions.set(session.key, session);
    }

    return session.ready || session.connecting ? Promise.resolve(session) : this.awaitSession(authority);
  }

  ensureSessions(authorities) {
    return Promise.all(authorities.map(this.ensureSession.bind(this)));;
  }

  awaitSession(authority) {
    return new Promise(resolve => this.once('SessionConnect::'+authority, resolve));
  }

  _request(method, url_string, opts = {}) {
    return new Promise((resolve, reject) => {
      const { protocol, hostname, pathname, search } = new URL(url_string);
      const { body, cipher, keepalive } = opts;

      const path = pathname+search;

      let headers = { ...opts.headers };
      
      this._parseUserAgent(headers);
      
      const authority = protocol+'//'+hostname;

      this.ensureSession(authority, { cipher }).then(session => {
        const stream = session.request({ ':method': method, ':path': path, ...headers });

        const failure_timeout_id = setTimeout(() => stream.emit('error'), 2**12);
        stream.on('response', () => clearTimeout(failure_timeout_id));
        stream.on('error', error => {
          if (!stream.retrying) {
            stream.retrying = true;
            this.onError({ resolve, reject }, arguments, session, error);
          }
        });

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
  }

  onError(promise, args, session, error) {
    const retry_on_error = args[2].retry_on_error ?? this.retry_on_error;
    if (!retry_on_error)
      return promise.reject('request error: '+error.code);

    const { logger } = this;
    const { ready, closed, destroyed, authority } = session;

    const retry = () => promise.resolve(this._request(...args));

    logger.warn('request error, retrying...');

    if (!ready || closed || destroyed) {
      this.awaitSession(authority).then(retry.bind(this));
    } else {
      asyncDelay(rand(2**11, 2**12)).then(retry.bind(this));
    }
  }

  onSessionError(session, error) {
    const { logger } = this;
    logger.error('session error:', error.code);
  }

  onSessionClose(session) {
    const { logger, keepalive } = this;
    const { ctime, ping_interval_id, authority } = session;

    session.ready = false;

    clearInterval(ping_interval_id);
    logger.debug('session close: %s', formatDuration(new Date()-(ctime ?? new Date()-1)));

    if (keepalive) {
      const retry_timeout = rand(2**11, 2**12);
      logger.debug('reconnection in %s', formatDuration(retry_timeout));
      asyncDelay(retry_timeout).then(() => {
        this.ensureSession(authority);
      });
    }
  }

  onSessionConnect(session) {
    const { authority } = session;
    const { logger } = this;

    session.ping_interval_id = setInterval(this.pingSession.bind(this, session), this.ping_interval);
    session.ctime = new Date();
    session.ready = true;

    logger.debug('session connect:', authority);
    this.emit('SessionConnect::'+authority, session);
  }

  pingSession(session) {
    const { logger } = this;
    // logger.debug('ping sent!');
    session.ping(PING_BUFF, clearTimeout.bind(void 0, setTimeout(session.destroy.bind(session), 2**10)));
  }
}

module.exports = Http2Client;
module.exports.USER_AGENT = Base.USER_AGENT;