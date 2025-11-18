// author: rochdi nassah
// created: 2025/10/06

'use strict';

const Logger = require('../logger');
const WebSocket = require('ws');
const EventEmitter = require('node:events');

class Client extends EventEmitter {
  constructor(address, opts = {}) {
    super();

    const { manual, logger } = opts;

    this.logger = logger ?? new Logger.SilentLogger();

    this.ready = false;
    this.address = address;

    this._pckt_id_counter = 0;

    this.on('error', this.onerror);
    this.on('close', this.onclose);
    this.on('open', this.onopen);
    this.on('message', this.onmessage);
    this.on('internal::ping', this[Symbol.for('internal::onping')]);
  }

  run() {
    return new Promise(resolve => {
      this.connection = new WebSocket(this.address);

      this.connection.on('error', this.emit.bind(this, 'error'));
      this.connection.on('close', () => (this.emit.bind(this, 'close'), resolve()));
      this.connection.on('open', () => (this.emit.bind(this, 'open'), resolve()));
      this.connection.on('message', this.emit.bind(this, 'message'));
    });
  }

  close() {
    const { connection } = this;

    if (!connection)
      return Promise.resolve();

    return new Promise(resolve => {
      connection.once('close', resolve);
      connection.close(1001);
    });
  }

  onerror(err) {
    this.logger.warn('connection error, code: %s', err.code);
  }

  onclose(code, buff) {
    buff = String(buff);
    this.ready = false;
    this.logger.verbose('connection close, code: %d, buff: %s', code, !buff.length ? 'unknown' : buff);
    setTimeout(this.connect.bind(this), rand(1e3, 3e3));
  }

  onopen() {
    this.ready = true;
    this.logger.verbose('connection open');
    this.emit('ready');
  }

  onmessage(msg) {
    const { t, d, i } = JSON.parse(msg);
    this.emit(t, d, i);
  }

  [Symbol.for('internal::onping')]() {
    this.connection.sendMessage('internal::pong');
  }

  sendMessage(t, d, cb) {
    const i = this._pckt_id_counter++;
    if (cb)
      this.once('reply::'+i, cb);
    this.connection.write({ t, d, i });
  };

  reply(id, data) {
    this.sendMessage('reply::'+id, data);
  }
};

module.exports = Client;