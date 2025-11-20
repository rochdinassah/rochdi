// author: rochdi nassah

'use strict';

const Http2Client = require('../../http2-client.js');
const EventEmitter = require('node:events');
const ChannelComponent = require('../components/channel');
const { format } = require('node:util');
const Discord = require('../');


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

class RequestService extends EventEmitter {
  constructor(main_service) {
    super();

    const { logger, token, type } = main_service;

    this.main_service = main_service;
    this.http2_client = new Http2Client({ logger });

    this.compileHeaders();
  }

  compileHeaders() {
    const { main_service } = this;
    const { type, token } = main_service;

    const headers = this.headers = {
      'authorization': '',
      'user-agent': '',
      'x-super-properties': xsp
    };

    if (void 0 !== type) {
      if ('bot' === type)
        delete headers['x-super-properties'];
      headers['authorization'] = 'bot' === type ? 'Bot '+token : token;
      headers['user-agent'] = 'bot' === type ? 'DiscordBot' : '';
    }
  }

  destroy() {
    this.http2_client.destroy();
  }
}

for (const method of ['get', 'post', 'delete', 'put', 'patch']) {
  RequestService.prototype[method] = function (endpoint, body, headers) {
    const { http2_client } = this;
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

module.exports = RequestService;