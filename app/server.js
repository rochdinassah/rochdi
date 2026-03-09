// author: rochdi nassah

'use strict';

const rochdi = require('..');
const fs = require('node:fs');

const { Server, Logger } = rochdi;
const { readFileSync } = fs;

const logger = new Logger({ prefix: 'app' });
const server = new Server({ port: 4444, logger });

server.get('/GetLocalAddr', (req, res) => {
  res.writeHead(200);
  res.write(String(readFileSync('/opt/rochdi/raw/addr')));
  res.end();
});

server.run();