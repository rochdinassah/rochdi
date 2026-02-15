// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const Logger = require('../logger');
const Http2Client = require('../http2-client');
const endpoints = require('./endpoint');

// test account' credentials
const conversation_id = '697aad57-b6c0-8333-b05a-d54b7d2a9c53';
const device_id = 'a3f1d9e4-6c2b-4f7a-9c8e-2b5f4d1a7e93';

const client_version = 'prod-8a8d1f164d583d75d1ee2db0eb330902a5ef4423';

const base_url = 'https://chatgpt.com/';

class Openai extends EventEmitter {
  constructor(opts = {}) {
    super();
    
    const logger = this.logger = opts.logger ?? new Logger.SilentLogger();

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