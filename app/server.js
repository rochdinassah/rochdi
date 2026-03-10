// author: rochdi nassah

'use strict';

const rochdi = require('..');
const fs = require('node:fs');

const { Logger } = rochdi;
const { readFileSync, writeFileSync } = fs;

const RAW_DIR = '/opt/rochdi/raw';

class Server extends rochdi.Server {
  constructor() {
    super({ port: 4444, logger: new Logger({ prefix: 'app' })});

    this.registerRoutes();
    this.run();
  }

  registerRoutes() {
    this.get('/GetLocalAddr', this.onGetLocalAddrRequest);
    this.any('/Interaction', this.onInteractionRequest);
    this.get('/GetInteraction', this.onGetInteractionInfoRequest);
  }

  onGetLocalAddrRequest(req, res) {
    res.writeHead(200);
    res.end(String(readFileSync(RAW_DIR+'/addr')));
  }

  onInteractionRequest(req, res) {
    const info = {
      ip: req.ip,
      time: new Date()
    };

    this.interaction_info = info;

    writeFileSync(RAW_DIR+'/interaction', format('Last interaction: %s', info.time));

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(info));
  }

  onGetInteractionInfoRequest(req, res) {
    const { interaction_info } = this;

    if (!interaction_info)
      return res.writeHead(404), res.end();

    res.writeHead(200);
    res.end(JSON.stringify(interaction_info));
  }
}

new Server();