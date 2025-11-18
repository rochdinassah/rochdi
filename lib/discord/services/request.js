// author: rochdi nassah

'use strict';

const Http2Client = require('../../http2-client.js');
const EventEmitter = require('node:events');
const ChannelComponent = require('../components/channel');
const { format } = require('node:util');

const xsp = 'eyJvcyI6IkxpbnV4IiwiYnJvd3NlciI6IkNocm9tZSIsImRldmljZSI6IiIsInN5c3RlbV9sb2NhbGUiOiJlbi1VUyIsImhhc19jbGllbnRfbW9kcyI6ZmFsc2UsImJyb3dzZXJfdXNlcl9hZ2VudCI6Ik1vemlsbGEvNS4wIChYMTE7IExpbnV4IHg4Nl82NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0MC4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTQwLjAuMC4wIiwib3NfdmVyc2lvbiI6IiIsInJlZmVycmVyIjoiIiwicmVmZXJyaW5nX2RvbWFpbiI6IiIsInJlZmVycmVyX2N1cnJlbnQiOiIiLCJyZWZlcnJpbmdfZG9tYWluX2N1cnJlbnQiOiIiLCJyZWxlYXNlX2NoYW5uZWwiOiJzdGFibGUiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjo0NDg2NzUsImNsaWVudF9ldmVudF9zb3VyY2UiOm51bGwsImNsaWVudF9sYXVuY2hfaWQiOiJjMWU3MmZjYy05ZDk3LTQ1MTItOWU2YS1iYTQyOWQ4MjMyN2YiLCJsYXVuY2hfc2lnbmF0dXJlIjoiMDg1YmE2MGMtNDVhNC00M2I0LTgyNDQtYmFiNzEyMjE2MzhlIiwiY2xpZW50X2hlYXJ0YmVhdF9zZXNzaW9uX2lkIjoiMjQyOTkxYTMtYmJhOC00YjJlLWI2ZDctZjk5YjEzMzg0YWM0IiwiY2xpZW50X2FwcF9zdGF0ZSI6ImZvY3VzZWQifQ==';

class RequestService extends EventEmitter {
  constructor(main_service) {
    super();

    const { logger } = main_service;

    this.main_service = main_service;
    this._http2_client = new Http2Client({ logger });
  }

  destroy() {
    this._http2_client.destroy();
  }
}

for (const method of ['get', 'post', 'delete', 'put', 'patch']) {
  RequestService.prototype[method] = function (endpoint, body, headers) {
    const url = 'https://discord.com/api/v10/'+endpoint.trim('\/');
    headers = {
      'Authorization': format('%s%s', 'bot' === this.main_service.type ? 'Bot ' : '', this.main_service.token),
      'User-Agent': format('%s', 'bot' === this.main_service.type ? 'DiscordBot' : ''),
      'X-Super-Properties': xsp,
      ...headers
    };
    if ('bot' === this.main_service.type)
      delete headers['X-Super-Properties'];
    if (body)
      headers['Content-Type'] = 'application/json';
    return this._http2_client[method](url, { headers, body });
  };
}

module.exports = RequestService;