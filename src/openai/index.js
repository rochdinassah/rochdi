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

    this.authorization = 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ik1IVzREcGtLazRRbzNsbkNwLVVQcjB5ZGt1Q0dxMU9BX3Q0UFpxQlJfMFEiLCJ0eXAiOiJKV1QifQ.eyJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSJdLCJjbGllbnRfaWQiOiJhcHBfWDh6WTZ2VzJwUTl0UjNkRTduSzFqTDVnSCIsImh0dHBzOi8vYXBpLm9wZW5haS5jb20vYXV0aCI6eyJhbXIiOlsidXJuOm9wZW5haTphbXI6Z29vZ2xlIl0sImNoYXRncHRfYWNjb3VudF9pZCI6ImQyNjA2ZTg4LTkzMjktNDVkOC1hNmY3LTFmNjk4Y2Y2Nzk5OSIsImNoYXRncHRfYWNjb3VudF91c2VyX2lkIjoidXNlci1Wa3RWYjNtQzY0Um9OTEF3dVl4WnpmczBfX2QyNjA2ZTg4LTkzMjktNDVkOC1hNmY3LTFmNjk4Y2Y2Nzk5OSIsImNoYXRncHRfY29tcHV0ZV9yZXNpZGVuY3kiOiJub19jb25zdHJhaW50IiwiY2hhdGdwdF9wbGFuX3R5cGUiOiJmcmVlIiwiY2hhdGdwdF91c2VyX2lkIjoidXNlci1Wa3RWYjNtQzY0Um9OTEF3dVl4WnpmczAiLCJ1c2VyX2lkIjoidXNlci1Wa3RWYjNtQzY0Um9OTEF3dVl4WnpmczAifSwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9wcm9maWxlIjp7ImVtYWlsIjoic2lkZS5mdW5jdGlvbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmFtaWx5X25hbWUiOiJmdW5jdGlvbiIsImdpdmVuX25hbWUiOiJTaWRlIiwibmFtZSI6IlNpZGUgZnVuY3Rpb24iLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jSzJkeUt3Vl9nbVV5UnFsLU9pTGN4UXdncUZ0MzQ5OUU5NTIxTW90dlJPT3U1UFV3PXM5Ni1jIn0sImlzcyI6Imh0dHBzOi8vYXV0aC5vcGVuYWkuY29tIiwicHdkX2F1dGhfdGltZSI6MTc4NzEwMjY5Mzc0Mywic2NwIjpbIm9wZW5pZCIsImVtYWlsIiwicHJvZmlsZSIsIm9mZmxpbmVfYWNjZXNzIiwibW9kZWwucmVxdWVzdCIsIm1vZGVsLnJlYWQiLCJvcmdhbml6YXRpb24ucmVhZCIsIm9yZ2FuaXphdGlvbi53cml0ZSJdLCJzZXNzaW9uX2lkIjoiYXV0aHNlc3NfUTM4aVlxRTh0aTVsblg0eng0bWJkN3JhIiwic2wiOnRydWUsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTA1MjE3MDk3MzQwMTMxNDU3NTMyIiwiaWF0IjoxNzg3MTAyNjk0LCJleHAiOjE3ODc5NjY2OTQsImp0aSI6ImQwOWE5NThmYTdiOTQ5NjI4MmM2MTNiYWRlNDAyZGQ2IiwibmJmIjoxNzg3MTAyNjk0fQ.OeSg8HpGtZ64eb64Qfbh8jjwlXpO394tYpuT8nCICpHnHne6K0xzSCL2cL7EHbOKipklC0eL826CvnwedSKIckl0Ihj_IvPN2nqCcwaF5uBMdNcnVQNzkqn_GFun-ogoMjqLnlPWCUjh7wWXHekNy76O7WGSrV4uE-PRosr0kyNg6jGaSj4Z1jxu8JTEZp70tHZtZyIzfs0b5y_qTL4rK5S9HrzPJZaa1zO237q8achdBMC-TCVMQDhsNWb8b31g1QiGMmfHcsGcRWvUcUH9iiUJhrUkvNPsxQriPRHH_XDIw3KuW2y62fntY7NZ-bxda70hTIWmESJx6NNiamcunw';
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