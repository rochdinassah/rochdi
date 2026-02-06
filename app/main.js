// author: rochdi nassah

'use strict';

require('..');

const { writeFileSync } = require('node:fs');
const { execSync } = require('node:child_process');

const DIR_PATH = __dirname;

awaitInternet().then(() => {
  const addr = String(execSync('hostname -I')).replace(/[\n\r\s]/g, '');

  writeFileSync(DIR_PATH+'/raw/addr', addr);
    
  execSync('git add -A &> /dev/null');
  execSync('git commit -m sync &> /dev/null');
  execSync('git push &> /dev/null');
});