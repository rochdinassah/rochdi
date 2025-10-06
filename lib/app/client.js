// author: rochdi nassah
// created: 2025/10/06

'use strict';

const Logger = require('../logger');
const WebSocket = require('ws');
const EventEmitter = require('node:events');

class Client extends EventEmitter {
  constructor(address) {
    super();

    this.logger = new Logger({ prefix: 'app-client' });

    this.ready = false;
    this.address = address;

    this._seq = 0;

    this.on('error', this.onerror);
    this.on('close', this.onclose);
    this.on('open', this.onopen);
    this.on('message', this.onmessage);
    this.on('ping', this.onping);
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
    this.ready = false;
    this.logger.verbose('connection close | code: %d, buff: %d', code, String(buff));
    setTimeout(this.connect.bind(this), rand(1e3, 3e3));
  }

  onopen() {
    this.ready = true;
    this.emit('ready');
    this.logger.verbose('connection open');
  }

  onmessage(msg) {
    const { t, d, s } = JSON.parse(String(msg));
    this.emit(t, d, s);
  }

  send_message(t, d, cb) {
    const s = this._seq++;
    if (cb)
      this.once('reply::'+s, cb);
    this.connection.write({ t, d, s });
  };

  onping() {
    this.send_message('pong');
    this.logger.verbose('pong sent to app');
  }

  reply(s, d) {
    this.send_message('reply::'+s, d);
  }
};

module.exports = Client;