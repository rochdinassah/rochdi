// author: rochdi nassah

'use strict';

const rochdi = require('../main');

const { HttpClient } = rochdi;

const { writeFileSync } = require('node:fs');
const { execSync } = require('node:child_process');

const DIR_PATH = '/opt/rochdi';

const http_client = new HttpClient();

awaitInternet().then(asyncDelay.bind(void 0, 2**12)).then(() => {
  const local_address = String(execSync('hostname -I')).replace(/[\n\r\s]/g, '');
  
  http_client.get('http://rochdi.ddns.net/LocalAddress').then(log);
});