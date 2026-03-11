// author: rochdi nassah

'use strict';

const rochdi = require('../main');
const fs = require('node:fs');

const { Logger } = rochdi;
const { readFileSync, writeFileSync } = fs;
const { env } = process;

const RAW_DIR = '/opt/rochdi/raw';
const port = env.HOST_PORT;

class Server extends rochdi.Server {
  constructor() {
    super({
      port,
      notification_channel: 'app',
      logger: new Logger({ prefix: 'app' })
    });

    this.registerRoutes();
    this.run();
  }

  registerRoutes() {
    this.get('/GetLocalAddr', this.onGetLocalAddrRequest);
    this.any('/Interaction', this.onInteractionRequest);
    this.get('/GetInteraction', this.onGetInteractionInfoRequest);
    this.post('/Cache', this.onCacheSetRequest);
    this.get('/Cache/{key}', this.onCacheGetRequest);
    this.delete('/Cache/{key}', this.onCacheDeleteRequest);
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

    res.writeHead(200).end('interaction ok');
  }

  onGetInteractionInfoRequest(req, res) {
    const { interaction_info } = this;

    if (!interaction_info)
      return res.writeHead(404), res.end();

    const headers = {
      'content-type': 'application/json'
    };

    res.writeHead(200, headers).end(JSON.stringify(interaction_info));
  }
  
  onCacheSetRequest(req, res) {
    const { data } = req;
    const { key, value } = data;
    const { cache } = this;

    let status_code = 200;

    if (void 0 === key)
      status_code = 422;
    else
      cache[key] = value;

    res.writeHead(status_code).end();
  }

  onCacheGetRequest(req, res) {
    const { params } = req;
    const { key } = params;
    const { cache } = this;

    let status_code = 200;

    if (void 0 === key)
      status_code = 422;

    const value = cache[key];

    res.writeHead(status_code).end(value);
  }

  onCacheDeleteRequest(req, res) {
    const { params } = req;
    const { key } = params;
    const { cache } = this;

    let status_code = 200;

    if (void 0 === key)
      status_code = 422;

    delete cache[key];

    res.writeHead(status_code).end();
  }
}

const server = new Server();

server.awaitReady().then(() => {
  server.http_client.get('http://127.1:80/Cache/name').then(res => {
    log(res.data);
  });
  server.notify('DEBUG_READY');
});