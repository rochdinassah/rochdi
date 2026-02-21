'use strict';

const rochdi = require('./');

const { StateManager, CommandManager, HttpClient, Http2Client } = rochdi;
const { Openai, Logger, Discord, Server, Client } = rochdi;

startTimer('Test');

void async function () {
  const logger = new Logger({ prefix: 'test' });
  
  logger.info('test in progress...');
  logger.info('test complete ok | %s', endTimer('Test'));
}();