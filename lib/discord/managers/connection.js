// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const WebSocket = require('ws');
const Discord = require('../');

WebSocket.prototype.write = function () {
  arguments[0] = JSON.stringify(arguments[0]);
  this.send(...arguments);
};

class ConnectionManager extends EventEmitter {
  constructor(manager) {
    super();

    const { logger } = manager;

    this.manager = manager;
    this.logger = logger;

    this.on('op::0', this.ondispatchevent);
    this.on('op::1', this.onheartbeatrequest);
    this.on('op::10', this.onheartbeatinterval);
    this.on('op::11', this.onheartbeatack);

    this.on('READY', this.onready);
  }

  connect(address) {
    this.connection = new WebSocket(address)
      .on('error', this.onerror.bind(this))
      .on('close', this.onclose.bind(this))
      .on('open', this.onopen.bind(this))
      .on('message', this.onmessage.bind(this));
  }

  resume() {
    const { session_id, resume_gateway_url, connection_manager } = this;

    if (!session_id || !resume_gateway_url)
      throw new Error('resume: "session_id" or "resume_gateway_url" are missing');
    
    connection_manager.state = 'RESUMING';
    connection_manager.connect(resume_gateway_url+'/?encoding=json&v='+Discord.API_VERSION);
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

  write(paylaod, callback) {
    const { connection } = this;
    if (connection)
      connection.write(paylaod, callback);
  }

  heartbeat() {
    this.write({ op: 1, d: { s: this.seq }});
  }

  onerror() {
    this.logger.error('connection error');
  }

  onclose(code, buff) {
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

  onopen() {
    this.logger.verbose('connection open');
  }

  onmessage(msg) {
    const data = JSON.parse(msg);
    const { t, s, op, d } = data;
    this.seq = s;
    if (!this.emit('op::'+op, d, t))
      log(op);
  }

  ondispatchevent(data, type) {
    this.emit(type, data);
  }

  onheartbeatrequest(data) {
    this.heartbeat();
  }

  onheartbeatinterval(data) {
    const { heartbeat_interval } = data;

    if ('CONNECTING' === this.state || 'RESUMING' === this.state)
      this.emit('RECV_INITIAL_HEARTBEAT_INTERVAL')
    
    clearInterval(this.heartbeat_interval_id);
    this.heartbeat_interval_id = setInterval(this.heartbeat.bind(this), heartbeat_interval);
    this.heartbeat();
  }

  onheartbeatack() {}

  onready(data) {
    const { session_id, resume_gateway_url } = data;

    this.session_id = session_id;
    this.resume_gateway_url = resume_gateway_url;

    this.state = 'CONNECTED';
  }

  onresumed(data) {
    this.state = 'CONNECTED';
  }
}

module.exports = ConnectionManager;