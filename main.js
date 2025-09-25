// author: rochdi nassah
// created: 2025/09/18

'use strict';

// apply patches
require('./lib/_patches');

// apply globals
require('./lib/_globals');

global.exit = (...args) => console.log(...args) || process.exit();
global.log = console.log.bind(console);
global.noop = Function.prototype;

module.exports = {
  Discord: require('./lib/discord'),
  Server: require('./lib/app/server'),
  Http2Client: require('./lib/http2-client'),
  HttpClient: require('./lib/http-client')
};