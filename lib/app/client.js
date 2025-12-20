// author: rochdi nassah
// created: 2025/10/06

'use strict';

const Logger = require('../logger');
const WebSocket = require('ws');
const EventEmitter = require('node:events');

class Client extends EventEmitter {
  constructor(address, opts = {}) {
    super();

    const { reconnect, manual, logger } = opts;

    this.logger = logger ?? new Logger.SilentLogger();

    this.ready = false;
    this.reconnect = reconnect ?? true;
    this.address = address;

    this.seq = 0;

    this.on('Ping', this.onPing);

    this.on('RestartRequestMessage', this.onRestartRequestMessage);
    this.on('StopRequestMessage', this.onStopRequestMessage);

    if (false === manual)
      this.run();
  }

  run() {
    return new Promise(resolve => {
      const conn = this.connection = new WebSocket(this.address);

      conn.once('close', resolve);
      conn.once('open', resolve);

      conn.on('error', this.onError.bind(this));
      conn.on('close', this.onClose.bind(this));
      conn.on('open', this.onOpen.bind(this));
      conn.on('message', this.onMessage.bind(this));
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

  onError(err) {
    this.logger.warn('connection error, code: %s', err.code);
    this.emit('Error');
  }

  onClose(code, buff) {
    this.ready = false;
    this.logger.verbose('connection close, code: %d, buff: %s', code, !buff.length ? 'unknown' : buff);

    if (![1000, 1001].includes(code) && this.reconnect)
      setTimeout(this.run.bind(this), rand(1e3, 3e3));
    
    this.emit('Close');
  }

  onOpen() {
    this.ready = true;
    this.logger.verbose('connection open');
    this.emit('Open');
  }

  onMessage(msg) {
    const { t, d } = JSON.parse(msg);
    this.emit(t, d);
  }
  
  onPing() {
    this.connection.sendMessage('Pong');
  }

  sendMessage(type, data = {}, cb) {    
    const seq = data.seq = this.seq++;
    if (cb)
      this.once('Reply::'+seq, cb);
    this.connection.send(JSON.stringify({ t: type, d: data }));
  };

  reply(seq, data) {
    this.sendMessage('Reply::'+seq, data);
  }

  stop(reason, delay) {
    this._exit(1, reason, delay);
  }

  restart(reason, delay) {
    this._exit(0, reason, delay);
  }
  
  async _exit(code, reason, delay) {
    const { logger } = this;
    if (logger)
      logger.info('(%s) %s : %s', code ? 'stop' : 'restart', delay ? format('in %s', formatDuration(delay)) : 'immediately', reason ?? 'none');
    if (delay)
      await new Promise(resolve => setTimeout(resolve, delay));
    process.exit(code);
  }

  onRestartRequestMessage(data) {
    this.restart(data.reason, data.delay);
  };

  onStopRequestMessage(data) {
    this.stop(data.reason, data.delay);
  }
};

module.exports = Client;