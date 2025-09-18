// author: rochdi nassah
// created: 2025/09/18

'use strict';

global.exit = (...args) => console.log(...args) || process.exit();

exit('ok', 1);