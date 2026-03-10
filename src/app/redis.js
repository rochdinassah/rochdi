// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const redis = require('redis');

const { env } = process;

const {
  REDIS_SERVER_USERNAME,
  REDIS_SERVER_PASSWORD,
  REDIS_SERVER_HOST,
  REDIS_SERVER_PORT
} = env;

class RedisClient extends EventEmitter {
  constructor(opts = {}) {
    super();

    const { logger } = opts;

    this.logger = logger;
    this.connected = false;
    
    const connection = this.connection = redis.createClient({
      username: REDIS_SERVER_USERNAME,
      password: REDIS_SERVER_PASSWORD,
      socket: {
        host: REDIS_SERVER_HOST,
        port: REDIS_SERVER_PORT,
        reconnectStrategy: retries => {
          if (32 < retries)
            return new Error('redis gave up for reconnection');
          return 2**12*retries;
        }
      }
    });

    connection.on('connect', this.onopen.bind(this));
    connection.on('ready', this.onready.bind(this));
    connection.on('reconnecting', this.onreconnecting.bind(this));
    connection.on('end', this.onclose.bind(this));
    connection.on('error', this.onerror.bind(this));

    connection.connect();
  }

  onerror() {}

  onreconnecting() {
    this.connected = false;
    this.logger.verbose('redis is reconnecting...');
  }

  awaitReady() {
    return this.connected || new Promise(resolve => this.once('Ready', () => resolve()));
  }

  onopen() {
    this.connected = true;
  }

  onready() {
    this.logger.verbose('redis ready');
    this.emit('Ready');
  }

  onclose() {
    this.connected = false;
    this.logger.verbose('redis close');
    this.emit('End');
  }

  close() {
    this.connection.disconnect();
  }

  delete(key) {
    return this.connection.del(key);
  }

  set(key, value, options = {}) {
    return this.connection.set(key, 'object' === typeof value ? JSON.stringify(value) : value, options);
  }

  get(key) {
    return this.connection.get(key).then(reply => {
      try {
        return JSON.parse(reply);
      } catch {}
      return reply;
    });
  }
}

module.exports = RedisClient;