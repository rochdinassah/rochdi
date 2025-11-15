// author: rochdi nassah
// created: 2025/10/06

'use strict';

const Logger = require('../logger');
const WebSocket = require('ws');
const EventEmitter = require('node:events');

class Client extends EventEmitter {
  constructor(address, opts = {}) {
    super();

    const { manual } = opts;

    this.logger = new Logger({ prefix: 'app-client' });

    this.ready = false;
    this.address = address;

    this._seq = 0;

    this.on('error', this.onerror);
    this.on('close', this.onclose);
    this.on('open', this.onopen);
    this.on('message', this.onmessage);
    this.on('internal::ping', this[Symbol.for('internal::onping')]);

    if (!manual)
      this.connect();
  }

  connect() {
    this.connection = new WebSocket(this.address);

    this.connection.on('error', this.emit.bind(this, 'error'));
    this.connection.on('close', this.emit.bind(this, 'close'));
    this.connection.on('open', this.emit.bind(this, 'open'));
    this.connection.on('message', this.emit.bind(this, 'message'));
  }

  onerror(err) {
    this.logger.warn('connection error | code: %s', err.code);
  }

  onclose(code, buff) {
    buff = String(buff);
    this.ready = false;
    this.logger.verbose('connection close | code: %d, buff: %s', code, !buff.length ? 'unknown' : buff);
    setTimeout(this.connect.bind(this), rand(1e3, 3e3));
  }

  onopen() {
    this.ready = true;
    this.logger.verbose('connection open');
    this.emit('ready');
  }

  onmessage(msg) {
    const { t, d, s } = JSON.parse(msg);
    this.emit(t, d, s);
  }

  [Symbol.for('internal::onping')]() {
    this.connection.sendMessage('internal::pong');
  }

  sendMessage(t, d, cb) {
    const s = this._seq++;
    if (cb)
      this.once('reply::'+s, cb);
    this.connection.write({ t, d, s });
  };

  reply(s, d) {
    this.sendMessage('reply::'+s, d);
  }
};

module.exports = Client;