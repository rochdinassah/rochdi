// author: rochdi nassah
// created: 2025/09/18

'use strict';

require('./lib/_patch');
require('./lib/_global');

global.exit = (...args) => void 0 !== args[0] && console.log(...args) || process.exit();
global.log = console.log.bind(console);
global.noop = Function.prototype;

module.exports = {
  StateManager: require('./lib/manager/state'),
  Openai: require('./lib/openai'),
  Command: require('./lib/command'),
  Logger: require('./lib/logger'),
  Discord: require('./lib/discord'),
  Client: require('./lib/app/client'),
  Server: require('./lib/app/server'),
  Http2Client: require('./lib/http2-client'),
  HttpClient: require('./lib/http-client')
};