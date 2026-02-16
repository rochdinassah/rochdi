// author: rochdi nassah

'use strict';

require('./src/_patch');
require('./src/_global');

global.exit = (...args) => void 0 !== args[0] && console.log(...args) || process.exit();
global.log = console.log.bind(console);
global.noop = Function.prototype;

module.exports = {
  StateManager: require('./src/manager/state'),
  CommandManager: require('./src/manager/command'),
  Openai: require('./src/openai'),
  Logger: require('./src/logger'),
  Discord: require('./src/discord'),
  Client: require('./src/app/client'),
  Server: require('./src/app/server'),
  Http2Client: require('./src/http2-client'),
  HttpClient: require('./src/http-client')
};