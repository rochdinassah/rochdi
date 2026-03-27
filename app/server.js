// author: rochdi nassah

'use strict';

const rochdi = require('../main');
const fs = require('node:fs');

const { Logger } = rochdi;
const { readFileSync, writeFileSync } = fs;
const { env } = process;

const port = env.HOST_PORT;

class Server extends rochdi.Server {
  constructor() {
    super({
      port,
      notification_channel: 'app',
      cache_key: 'rochdi',
      logger: new Logger({ prefix: 'app' })
    });

    this.registerRoutes();
    this.registerCommands();
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

  registerCommands() {
    const { command_manager } = this;
    command_manager.on('ping', this.onPingCommand.bind(this));
  }

  onGetLocalAddrRequest(req, res) {
    res.writeHead(200);
    res.end(this.cache.local_addr);
  }

  onInteractionRequest(req, res) {
    const { data } = req;

    const info = {
      ip: req.ip,
      time: new Date(),
      payload: data ? data : (new URL('http://127.1'+req.url)).searchParams.get('payload') ?? 'NO_PAYLOAD'
    };

    this.interaction_info = info;

    this.notifyVerbose('interaction', {
      table: info,
      mention: ['400046787341320227'],
    });
    
    res.writeHead(200).end('interaction ok\n');
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

  onPingCommand() {
    this.notifyVerbose('pong');
  }
}

const server = new Server();

server.awaitReady().then(() => {
  const { logger, discord } = server;

  server.notifyVerbose('app server ready');
  
  const messages = {};
    
  discord.connection_manager.on('MESSAGE_CREATE', msg => {
    const { id, content, channel_id, author, guild_id } = msg;

    if (discord.user_id === author.id)
      return;

    const author_id = author.id;
    const author_name = author.global_name ?? author.username;
    const guild = discord.guild_manager.getGuild(guild_id);
    const channel = guild.getChannel(channel_id);
    const guild_name = guild.name;
    const channel_name = channel.name;

    const patterns = [
      'rochdi',
      'rouchdi',
      'roxdi',
      'rouxdi',
      'roxhdi',
      'rouxhdi',
      'roushdi',
      'roshdi',
      'رشدي',
      'روشدي'
    ].map(pattern => new RegExp(pattern.split('').map(character => character+'{1,}').join(''), 'i'));
    
    if (patterns.filter(pattern => pattern.test(content.replace(/[^a-z\u0623-\u06FF]/ig, ''))).length) {
      server.notifyError(format('action required (%s)', guild_name), {
        table: {
          channel: channel_name,
          sender: format('%s | %s', author_name, author_id),
          content: content
        },
        mention: ['400046787341320227']
      });
    }

    messages[id] = msg;
  });

  discord.connection_manager.on('MESSAGE_DELETE', msg => {      
    const message = messages[msg.id];

    if (!message || '1481131563080220754' === message.channel_id)
      return;

    const { id, content, channel_id, author, guild_id, attachments } = message;

    const author_id = author.id;
    const author_name = author.global_name ?? author.username;
    const guild = discord.guild_manager.getGuild(guild_id);
    const channel = guild.getChannel(channel_id);
    const guild_name = guild.name;
    const channel_name = channel.name;

    server.notifyError(format('message deleted (%s)', guild_name), {
      table: {
        channel: channel_name,
        sender: format('%s | %s', author_name, author_id),
        content: content,
        attachments: attachments.length ? attachments[0].url : 'none'
      },
      mention: ['400046787341320227']
    });
  });
});