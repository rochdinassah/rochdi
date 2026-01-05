// author: rochdi nassah

'use strict';

const Http2Client = require('../../http2-client.js');
const EventEmitter = require('node:events');
const { format } = require('node:util');
const Discord = require('../index.js');

const base_url = 'https://discord.com/api/v'+Discord.API_VERSION+'/';

const xsp_obj = {
  os: 'Linux',
  browser: 'Chrome',
  device: '',
  system_locale: 'en-US',
  has_client_mods: false,
  browser_user_agent: Http2Client.USER_AGENT,
  browser_version: '140.0.0.0',
  os_version: '',
  referrer: '',
  referring_domain: '',
  referrer_current: '',
  referring_domain_current: '',
  release_channel: 'stable',
  client_build_number: 448675,
  client_event_source: null,
  client_launch_id: 'c1e72fcc-9d97-4512-9e6a-ba429d82327f',
  launch_signature: '085ba60c-45a4-43b4-8244-bab71221638e',
  client_heartbeat_session_id: '242991a3-bba8-4b2e-b6d7-f99b13384ac4',
  client_app_state: 'focused'
};

const xsp = btoa(JSON.stringify(xsp_obj));

let http2_client;

class ApiManager extends EventEmitter {
  constructor(manager) {
    super();

    const { logger, token } = manager;

    this.manager = manager;

    if (!http2_client)
      http2_client = new Http2Client({ logger });

    this.compileHeaders();
  }

  compileHeaders() {
    const { manager } = this;
    const { bot_user, token } = manager;

    const headers = this.headers = {
      'authorization': '',
      'user-agent': '',
      'x-super-properties': xsp
    };

    if (void 0 !== bot_user) {
      if (bot_user)
        delete headers['x-super-properties'];
      headers['authorization'] = bot_user ? 'Bot '+token : token;
      headers['user-agent'] = bot_user ? 'DiscordBot' : '';
    }
  }

  close() {
    this.http2_client.destroy();
  }

  fetchMe(attempt = 1) {
    if (3 === attempt)
      return false;
    const { logger, token } = this.manager;
    return this.get('users/@me', void 0, { 'authorization': 2 === attempt ? token : 'Bot '+token }).then(res => {
      const { status_code, data } = res;
      if (401 === status_code)
        return this.fetchMe(1+attempt);
      if (200 !== status_code)
        throw new Error('fetchMe: request error, http('+status_code+')');
      this.manager.bot_user = Boolean(data.bot);
      this.compileHeaders();
      return data;
    });
  }
}

for (const method of ['get', 'post', 'delete', 'put', 'patch']) {
  ApiManager.prototype[method] = function (endpoint, body, headers) {
    const url = base_url+endpoint.trim('\/');

    headers = {
      ...this.headers,
      ...headers
    };

    if (body)
      headers['content-type'] = 'application/json';

    return http2_client[method](url, { headers, body });
  };
}

module.exports = ApiManager;