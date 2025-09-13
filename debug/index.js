'use strict';

const log = console.log.bind(console);

const util = require('node:util');
const { format } = util;
const Http2Client = require('../lib/http2-client');
const HttpClient = require('../lib/http-client');
const helpers = require('../lib/helpers');
const Command = require('../lib/command');
const http2 = require('node:http2');
const crypto = require('node:crypto');
const openai = require('../openai');

const { toQueryString, startTimer, getTimer, endTimer } = helpers;
const { formatDuration, wait, benchmark } = helpers;

void async function () {
  const http2Client = new Http2Client();
  const command = new Command();

  command.on('send', (...args) => {
    openai.sendMessage(args.join(' ')).then(reply => {
      log(reply.content, '|', reply.took);
    });
  });

  command.start();
}();