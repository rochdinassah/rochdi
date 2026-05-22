// author: rochdi nassah

'use strict';

const Base = require('./http-client');
const http2 = require('node:http2');
const Logger = require('./logger');
const TimerManager = require('./manager/timer');

const PING_BUFF = Buffer.from('        ');

class Http2Client extends Base {
  constructor(opts = {}) {
    super();

    const { logger, retry_on_error, timeout, ping_interval, user_agent } = opts;

    this.logger = logger ?? new Logger.SilentLogger();
    this.retry_on_error = retry_on_error ?? this.retry_on_error;
    this.timeout = timeout;
    this.ping_interval = ping_interval ?? 59e3;
    this.user_agent = user_agent ?? this.user_agent;
    this.timer_manager = new TimerManager();

    this.sessions = new Map();
  }

  close() {
    const { logger, sessions, timer_manager } = this;
    timer_manager.close();
    for (const session of sessions.values())
      session.destroy();
    logger.debug('http2_client closed');
  }

  ensureSession(url_string, opts = {}) {
    const { logger, sessions, timer_manager } = this;
    const { hostname, protocol } = new URL(url_string);
    const { cipher } = opts;

    const authority = protocol+'//'+hostname;

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

    if (session.ready)
      return Promise.resolve(session);

    timer_manager.setInterval('SessionInsurance::'+authority+'::'+cipher, () => {
      session = sessions.get(authority);
      
      if (session) {
        session.removeAllListeners();
        session.destroy();
        sessions.delete(session.key);
      }

      this.updateCipher(cipher);
      this.resetCipher(cipher, void(session = http2.connect(authority)));

      session.on('error', noop);
      session.on('connect', this.onSessionConnect.bind(this, session));
      session.on('connect', () => {
        session.on('error', this.onSessionError.bind(this, session));
        session.on('close', this.onSessionClose.bind(this, session));
      });

      session.cipher = cipher;
      session.key = authority;
      session.authority = authority;

      sessions.set(session.key, session);
    }, 2**13);

    return this.awaitSession(authority, cipher);
  }

  ensureSessions(authorities) {
    return Promise.all(authorities.map(this.ensureSession.bind(this)));;
  }

  awaitSession(authority, cipher) {
    return new Promise(resolve => this.once('SessionConnect::'+authority+'::'+cipher, resolve));
  }

  _request(method, url_string, opts = {}) {
    return new Promise((resolve, reject) => {
      const { pathname, search } = new URL(url_string);
      const { body, cipher } = opts;

      const path = pathname+search;

      let headers = { ...opts.headers };
      
      this._parseUserAgent(headers);

      this.ensureSession(url_string, { cipher }).then(session => {
        try {
          var stream = session.request({ ':method': method, ':path': path, ...headers });
        } catch {
          return resolve({ status_code: -1 });
        }

        const failure_timeout_id = setTimeout(() => stream.emit('error', { code: 'timeout' }), 2**12);
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
      return promise.reject('request error: "%s", '+error.code, args[1]);

    const { logger } = this;
    const { ready, closed, destroyed, authority, cipher } = session;

    const retry = () => promise.resolve(this._request(...args));

    logger.warn('request error: "%s", retrying...', args[1]);

    session.close();
    awaitInternet().then(() => {
      this.ensureSession(args[1], cipher);
      asyncDelay(2**11, 2**12).then(retry.bind(this));
    });
  }

  onSessionError(session, error) {
    const { logger } = this;
    logger.error('session error:', error.code);
  }

  onSessionClose(session) {
    const { logger } = this;
    const { ctime, ping_interval_id, authority } = session;

    session.ready = false;
    
    clearInterval(ping_interval_id);
    logger.debug('session close: %s', formatDuration(new Date()-(ctime ?? new Date()-1)));
  }

  onSessionConnect(session) {
    const { authority, cipher } = session;
    const { logger, ping_interval, timer_manager } = this;

    if (ping_interval)
      session.ping_interval_id = setInterval(this.pingSession.bind(this, session), ping_interval);

    session.ctime = new Date();
    session.ready = true;
    
    timer_manager.cancel('SessionInsurance::'+authority+'::'+cipher);
    logger.debug('session connect:', authority);
    this.emit('SessionConnect::'+authority+'::'+cipher, session);
  }

  pingSession(session) {
    const { logger } = this;
    try {
      session.ping(PING_BUFF, clearTimeout.bind(void 0, setTimeout(session.destroy.bind(session), 2**10)));
    } catch {}
  }
}

module.exports = Http2Client;
module.exports.USER_AGENT = Base.USER_AGENT;