// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const Logger = require('../logger');
const Http2Client = require('../http2-client');
const endpoints = require('./endpoint');

// test account' credentials
const conversation_id = '6a85060c-98e8-83eb-adfe-eec9dad8b1ef';
const device_id = 'a3f1d9e4-6c2b-4f7a-9c8e-2b5f4d1a7e93';

const client_version = 'prod-8a8d1f164d583d75d1ee2db0eb330902a5ef4423';

const base_url = 'https://chatgpt.com/';

class Openai extends EventEmitter {
  constructor(opts = {}) {
    super();
    
    const logger = this.logger = opts.logger ?? new Logger({ prefix: 'openai' });

    this.conversation_id = opts.conversation_id ?? conversation_id;
    this.http2_client = new Http2Client({ logger });
    this.requirements_cache = new Set();

    this.authorization = decrypt('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', process.env.ENCRYPTION_PASSWORD);
  }
  
  run() {
    const { http2_client } = this;
    http2_client.createSession(base_url).then(() => {
      for (let i = 0; 4 > i; ++i)
        this.cacheRequirements();
      this.startRequirementsLoop();
    });
  }

  startRequirementsLoop() {
    this.stopRequirementsLoop();
    this.requirements_loop_interval_id = setInterval(this.cacheRequirements.bind(this), 4e3);
  }

  stopRequirementsLoop() {
    clearInterval(this.requirements_loop_interval_id);
    this.requirements_loop_interval_id = void 0;
  }

  cacheRequirements() {
    const { requirements_cache } = this;
    this.fetchRequirements().then(requirements => {
      requirements.expiration_timeout_id = setTimeout(() => {
        requirements_cache.delete(requirements);
        if (4 === requirements_cache.size)
          this.startRequirementsLoop();
      }, 42e4);
      requirements_cache.add(requirements);
      if (32 === requirements_cache.size)
        this.stopRequirementsLoop();
    });
  }

  fetchRequirements() {
    const { logger } = this;
    const { url, headers, body } = endpoints.requirements;

    return this.post(url, body, headers).then(res => {
      const { status_code, data } = res;

      if (200 !== status_code)
        return logger.error('fetchRequirements: request error, http(%d)', status_code), false;

      const { persona, token, expire_after, expire_at, turnstile, proofofwork } = data;
      const { dx } = turnstile;
      const { seed, difficulty } = proofofwork;

      const solution = solveChallenge(seed, difficulty);

      return { proof: solution, token };
    });
  }

  getRequirements() {
    const { requirements_loop_interval_id, requirements_cache } = this;

    if (void 0 === requirements_loop_interval_id && 4 > requirements_cache.size)
      this.startRequirementsLoop();

    if (!requirements_cache.size)
      return this.fetchRequirements();

    const requirements = requirements_cache.values().next().value;

    clearTimeout(requirements.expiration_timeout_id);

    requirements_cache.delete(requirements);

    log('pulled requirements from cache, curr size:', requirements_cache.size);

    return Promise.resolve(requirements);
  }
  
  sendMessage(content) {
    const timer_label = randomString(8);

    startTimer(timer_label);

    return this.getRequirements().then(({ proof, token }) => {
      const { logger, conversation_id } = this;
      const { url, headers, body } = endpoints.conversation;

      headers['Openai-Sentinel-Proof-Token'] = proof;
      headers['Openai-Sentinel-Chat-Requirements-Token'] = token;

      body.conversation_id = conversation_id;
      body.messages[0].content.parts[0] = content;

      return this.post(url, body, headers).then(res => {
        const { status_code, data } = res;
        const timer = endTimer(timer_label);

        if (200 !== status_code)
          return logger.warn('sendMessage: request error, http(%d)', status_code), false;

        const response = decodeEventStream(data);

        if (void 0 === response)
          exit('decodeEventStream error', data);
        
        return { content: response, took: timer };
      });
    });
  }
}

for (const method of ['get', 'post', 'delete', 'put', 'patch']) {
  Openai.prototype[method] = function (endpoint, body, headers) {
    const { http2_client, authorization } = this;
    const url = base_url+endpoint.replace(/^\/|\/$/, '');
    headers = {
      ...headers,
      'Authorization': authorization,
      'User-Agent': '',
      'Oai-Device-Id': device_id,
      'Oai-Client-Version': client_version,
      'Origin': base_url.replace(/\/$/, '')
    };
    if (body)
      headers['Content-Type'] = 'application/json';
    return http2_client[method](url, { headers, body });
  };
}

function decodeEventStream(payload) {
  const lines = payload.split('\n');

  let content = '', marker_start, obj;

  for (const line of lines) {
    if (!line.length)
      continue;

    let [key, val] = line.split(/^(\w+)\:\s/).splice(1);
    
    if ('data' === key) {
      try {
        obj = JSON.parse(val);
      } catch {
        continue;
      }

      if ('object' !== typeof obj)
        continue;

      if (obj.type === 'message_stream_complete')
        return content;

      if (obj.type === 'message_marker') {
        marker_start = true;
        continue;
      }

      if (marker_start) {
        if ('string' === typeof obj.v) {
          content += obj.v;
          continue;
        } else if (Array.isArray(obj.v)) {
          for (const v of obj.v)
            if ('append' === v.o && 'string' === typeof v.v)
              content+= v.v;
        }
      }
    }
  }

  return marker_start;
}

// the challenge solving implementation is extracted from the original openai asset
// challenge solving start
function solveChallenge(seed, difficulty) {
  const s = performance.now();
  for (let a = 0; a < 5e5; a++) {
    const i = rc(s, seed, difficulty, [], a);
    if (i)
      return 'gAAAAAB'+i;
  }
}
function rc(e, n, s, o, a) {
  o[3] = a, o[9] = Math.round(performance.now()-e);
  const i = btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  let b = 2166136261, k = n+i;
  for (let q = 0; q < k.length; q++)
    b ^= k.charCodeAt(q),
    b = Math.imul(b, 16777619) >>> 0;
  const m = (b ^= b >>> 16,
    b = Math.imul(b, 2246822507) >>> 0, b ^= b >>> 13,
    b = Math.imul(b, 3266489909) >>> 0, b ^= b >>> 16,
    (b >>> 0).toString(16).padStart(8, "0"));
  return m.substring(0, s.length) <= s ? i + "~S" : null;
}
// challenge solving end

module.exports = Openai;