// author: rochdi nassah
// created: 2025/09/18

'use strict';

// apply patches
require('./lib/_patches');

// apply globals
require('./lib/_globals');

module.exports = {
  Http2Client: require('./lib/http2-client'),
  HttpClient: require('./lib/http-client')
};