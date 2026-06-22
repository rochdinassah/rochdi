// author: rochdi nassah

'use strict';

const Logger = require('../logger');
const WebSocket = require('ws');
const EventEmitter = require('node:events');
const CommandManager = require('../manager/command');
const HttpClient = require('../http-client');
const Http2Client = require('../http2-client');
const TimerManager = require('../manager/timer');
const NetworkManager = require('../manager/network');

class Client extends EventEmitter {
  constructor(address, opts = {}) {
    super();

    const { ping_interval, reconnect, manual, namespace } = opts;

    const logger = this.logger = opts.logger ?? new Logger({ prefix: 'client' });
    
    this.ready = false;
    this.ping_interval = ping_interval ?? 2**16;
    this.reconnect = reconnect ?? true;
    this.address = address;
    this.namespace = namespace;
    this.command_manager = new CommandManager();
    this.http_client = new HttpClient({ logger });
    this.http2_client = new Http2Client({ logger });
    this.timer_manager = new TimerManager();
    this.network_manager = new NetworkManager({ logger });

    this.seq = 0;

    this.on('Ping', this.onPing);
    this.on('RestartRequestMessage', this.onRestartRequestMessage);
    this.on('StopRequestMessage', this.onStopRequestMessage);
    this.on('CommandMessage', this.onCommandMessage);
    
    if (false === manual)
      this.run();
  }

  awaitReady() {
    if (this.ready)
      return Promise.resolve();
    return new Promise(resolve => this.once('Ready', resolve));
  }

  run() {
    return new Promise(resolve => {
      const { connection, namespace } = this;

      if (connection)
        connection.close(1001);

      const conn = this.connection = new WebSocket(this.address, {
        headers: {
          namespace,
          machine_id: getMachineId()
        }
      });

      conn.on('error', this.onError.bind(this));
      conn.on('close', this.onClose.bind(this));
      conn.on('open', resolve);
      conn.on('open', this.onOpen.bind(this));
      conn.on('message', this.onMessage.bind(this));
    });
  }

  close() {
    const { connection, timer_manager } = this;

    timer_manager.close();

    if (!connection)
      return Promise.resolve();

    return new Promise(resolve => {
      connection.once('close', resolve);
      connection.close(1000);
    });
  }
  
  onError(err) {
    this.logger.debug('connection error, code: %s', err.code);
    this.emit('Error');
  }

  onClose(code, buff) {
    this.ready = false;
    this.logger.debug('connection close, code: %d, buff: %s', code, !buff.length ? 'unknown' : buff);

    if (![1000, 1001].includes(code) && this.reconnect)
      setTimeout(this.run.bind(this), rand(1e3, 3e3));

    this.emit('Close', code, buff);
  }

  onOpen() {
    const { logger, timer_manager, ping_interval } = this;
    timer_manager.setInterval('PingServer', this.ping.bind(this), ping_interval);
    logger.verbose('connection open');
    this.ready = true;
    this.emit('Open');
    this.emit('Ready');
  }

  onMessage(msg) {
    const { t, d } = JSON.parse(msg);
    this.emit(t, d);
  }
  
  onPing(msg) {
    this.reply(msg.seq);
  }

  sendMessage(type, data = {}, cb) {
    const { connection } = this;
    const { readyState } = connection;
    if (1 === readyState) {
      const seq = data.seq = this.seq++;
      if (cb)
        this.once('Reply::'+seq, cb);
      connection.send(JSON.stringify({ t: type, d: data }));
    }
  };

  reply(seq, data) {
    this.sendMessage('Reply::'+seq, data);
  }

  ping() {
    const { timer_manager, ping_interval } = this;
    timer_manager.setTimeout('DeadConnection', this.close.bind(this, 1009, 'dead server'), Math.floor(ping_interval));
    this.sendMessage('Ping', {}, timer_manager.cancel.bind(timer_manager, 'DeadConnection'));
  }

  stop(reason, delay) {
    this._stop(1000, reason, delay);
  }

  restart(reason, delay) {
    this._stop(1001, reason, delay);
  }
  
  _stop(code, reason, delay) {
    const { logger } = this;
    const f = formatDuration;
    if (logger)
      logger.info('(%s) %s : %s', code === 1001 ? 'restart' : 'stop', delay ? format('in %s', f(delay)) : 'immediately', reason ?? 'none');
    if (delay)
      asyncDelay(delay).then(this.close.bind(this, code, reason));
    else
      this.close(code, reason);
  }

  onRestartRequestMessage(data) {
    this.restart(data.reason, data.delay);
  }

  onStopRequestMessage(data) {
    this.stop(data.reason, data.delay);
  }

  onCommandMessage(data) {
    const { cmd, args, seq } = data;
    const { command_manager } = this;
    this.emit('Command', cmd, args);
    this.reply(seq, { ok: command_manager.emit(cmd, ...args) });
  }

  notify(content, opts = {}) {
    const { logger } = this;
    const { table } = opts;

    const content_present = String(content).length && String(void 0) !== String(content) || String(void 0) === content;
    if (!content_present && table)
      log(table);
    else if (content_present && !table)
      logger.verbose(content);
    else if (content_present && table)
      log(content+':', table);

    return new Promise(resolve => {
      return this.sendMessage('NotificationRequestMessage', { content, opts: { level: 'verbose', ...opts } }, resolve);
    });
  }

  triggerNotification(content, opts) {
    const { logger } = this;
    return new Promise(resolve => {
      this.sendMessage('TriggerNotificationRequestMessage', { content, opts }, reply => {
        logger.verbose('notification triggered');
        resolve();
      });
    });
  }

  notifyError(content, opts = {}) {
    return this.notify(content, { ...opts, level: 'error' });
  }

  notifyWarn(content, opts = {}) {
    return this.notify(content, { ...opts, level: 'warn' });
  }

  notifyInfo(content, opts = {}) {
    return this.notify(content, { ...opts, level: 'info' });
  }

  notifyVerbose(content, opts = {}) {
    return this.notify(content, { ...opts, level: 'verbose' });
  }
};

module.exports = Client;