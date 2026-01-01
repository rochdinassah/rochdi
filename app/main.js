// author: rochdi nassah

'use strict';

const rochdi = require('..');
const fs = require('node:fs');
const child_process = require('node:child_process');

const { Server, Logger } = rochdi;
const { execSync } = child_process;

const logger = new Logger({ prefix: 'app' });
const server = new Server({ port: 2048, logger });

const DIR_PATH = __dirname;

const addr = String(execSync('hostname -I')).replace(/[\n\r\s]/g, '');

fs.writeFileSync(DIR_PATH+'/raw/addr', addr);