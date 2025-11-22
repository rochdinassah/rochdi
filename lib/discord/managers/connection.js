// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const WebSocket = require('ws');
const Discord = require('../');

class ConnectionManager extends EventEmitter {
  constructor(manager) {
    super();

    const { logger } = manager;

    this.manager = manager;
    this.logger = logger;

    this.on('Op::0', this.onDispatchEvent);
    this.on('Op::1', this.onHeartbeatRequest);
    this.on('Op::10', this.onHeartbeatInterval);
    this.on('Op::11', this.onHeartbeatAck);

    this.on('READY', this.onReadyMessage);
    this.on('RESUMED', this.onResumedMessage);
  }

  connect(address) {
    this.connection = new WebSocket(address)
      .on('error', this.onError.bind(this))
      .on('close', this.onClose.bind(this))
      .on('open', this.onOpen.bind(this))
      .on('message', this.onMessage.bind(this));
  }

  resume() {
    const { session_id, resume_gateway_url, connection_manager } = this;

    if (!session_id || !resume_gateway_url)
      throw new Error('resume: "session_id" or "resume_gateway_url" are missing');

    this.state = 'RESUMING';
    this.connect(resume_gateway_url+'/?encoding=json&v='+Discord.API_VERSION)
  }

  disconnect() {
    const { connection } = this;
    if (!connection)
      return Promise.resolve();
    return new Promise(resolve => {
      connection.once('close', resolve);
      connection.close(1001);
    });
  }

  send(payload, callback) {
    const { connection } = this;
    if (connection)
      connection.send(JSON.stringify(payload), callback);
  }

  heartbeat() {
    this.send({ op: 1, d: { s: this.seq }});
  }

  onError() {
    this.logger.error('connection error');
  }

  onClose(code, buff) {
    const { heartbeat_interval_id, session_id, resume_gateway_url, state, seq, logger } = this;

    clearInterval(heartbeat_interval_id);
    
    if (4001 === code)
      return;

    this.state = 'CLOSED';
    this.heartbeat_interval_id = void 0;
    this.last_seq = seq;

    logger.warn('connection close, code: %d, data: %s', code, String(buff));

    if (1000 === code || 1001 === code)
      return this.manager.api_manager.close();

    if (session_id && resume_gateway_url)
      this.resume();
    else
      setTimeout(this.connect.bind(this), rand(1e3, 2e3));
  }

  onOpen() {
    this.logger.verbose('connection open');
  }

  onMessage(msg) {
    const data = JSON.parse(msg);
    const { t, s, op, d } = data;
    if (!this.emit('Op::'+op, d, t, s))
      log(op);
  }

  onDispatchEvent(data, type, seq) {
    this.seq = seq;
    this.emit(type, data);
  }

  onHeartbeatRequest(data) {
    this.heartbeat();
  }

  onHeartbeatInterval(data) {
    const { heartbeat_interval } = data;

    if ('CONNECTING' === this.state || 'RESUMING' === this.state)
      this.emit('RECV_INITIAL_HEARTBEAT_INTERVAL')
    
    clearInterval(this.heartbeat_interval_id);
    this.heartbeat_interval_id = setInterval(this.heartbeat.bind(this), heartbeat_interval);
    this.heartbeat();
  }

  onHeartbeatAck() {}

  onReadyMessage(data) {
    const { session_id, resume_gateway_url } = data;
    this.state = 'CONNECTED';
    this.resume_gateway_url = resume_gateway_url;
    this.session_id = session_id;
  }

  onResumedMessage(data) {
    this.state = 'CONNECTED';
  }
}

module.exports = ConnectionManager;