// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class MessageManager extends EventEmitter {
  constructor(manager) {
    super();

    const { logger, connection_manager } = manager;

    this.manager = this;
    this.connection_manager = connection_manager;
    this.logger = logger;

    this.startListen(connection_manager);
  }

  startListen(cm) {
    cm.on('MESSAGE_CREATE', this.onMessageCreate);
  }

  onMessageCreate(msg) {
    exit('MessageManager: recv message');
  }
}

module.exports = MessageManager;