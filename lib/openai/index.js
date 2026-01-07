// author: rochdi nassah
// created: 2025/11/1

'use strict';

const EventEmitter = require('node:events');
const Logger = require('../logger');
const Http2Client = require('../http2-client');
const endpoints = require('./endpoint');

const http2_client = new Http2Client();

// test account' credentials
const authorization = 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjE5MzQ0ZTY1LWJiYzktNDRkMS1hOWQwLWY5NTdiMDc5YmQwZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSJdLCJjbGllbnRfaWQiOiJhcHBfWDh6WTZ2VzJwUTl0UjNkRTduSzFqTDVnSCIsImV4cCI6MTc2ODM5NDcwNywiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7ImNoYXRncHRfY29tcHV0ZV9yZXNpZGVuY3kiOiJub19jb25zdHJhaW50IiwiY2hhdGdwdF9kYXRhX3Jlc2lkZW5jeSI6Im5vX2NvbnN0cmFpbnQiLCJ1c2VyX2lkIjoidXNlci1kcDhuVjZJOGtBSEl3bFRyYzVZMno5N3IifSwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9wcm9maWxlIjp7ImVtYWlsIjoiZ2VuZXJhdG9yNDA5NkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sImlhdCI6MTc2NzUzMDcwNywiaXNzIjoiaHR0cHM6Ly9hdXRoLm9wZW5haS5jb20iLCJqdGkiOiIxNGYyMjI5My05MmRkLTRjOWUtODgxZi03ZGRjMjZlOTQ1MzAiLCJuYmYiOjE3Njc1MzA3MDcsInB3ZF9hdXRoX3RpbWUiOjE3NjUxNzk0MTY3NzgsInNjcCI6WyJvcGVuaWQiLCJlbWFpbCIsInByb2ZpbGUiLCJvZmZsaW5lX2FjY2VzcyIsIm1vZGVsLnJlcXVlc3QiLCJtb2RlbC5yZWFkIiwib3JnYW5pemF0aW9uLnJlYWQiLCJvcmdhbml6YXRpb24ud3JpdGUiXSwic2Vzc2lvbl9pZCI6ImF1dGhzZXNzX2tWbXprVzBvRmlKNE8wTGUzbDJlWVB4ZyIsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTAzMzk5NjQ2MDQ1MDk3MDAxNzYxIn0.OCYszHPZj_yvnw1vUiISVUvfkWoJCPCsg3KOCkrh1socOkOAfYIuN287q6otbuFjHsdTbjCrNiq_jVOJYUZCoHErMsnodQpAX7CngVS7lX3zMdg9w3w_udikgQwaMiB6U5T6twbFywo5IMJJXZ7VpNk651CuT9mz9bVy9ut8PxnrpZccks7Tw7OaJy1nGKtD-MHO3AFJbAjUPyFCqm5xzoC-lURn514Tkx0yYEWnAlhiJ9zWzHnT2ZAQkBOX6N14mm_4sNdVtGNLeTaBoHtWhInUEcaNPN8Wm6D-Zb6xHdP1uudkNZSzTTxVnK5eNhcYjs94IyFuei1G3A8w_yOa5pFk8XNBLMQMRqp27K5T-dxATibbddVx33UmsGkUhsHDhs2CG7yqzD3ZaQDUDCgpY-AwipkrhFZdvLrI9AlQifx8Fag0E5-Ncuw2kgOUgHr9moNrzfPegXd3lZHFMnPqfC4Zp99h1Fg9F3EnInKLIJ9bD_jgBWEA1qVCreHoUftGvhaGIUmyFNtYKb6NxZVCVCC2U-968J_0d5B2Qibe7gyaSmJfK67U93UfpGKtbGL_5lf0c6Z3PH2JhVBW1eAVEzCWx2QC5fAlbHWZB14e_7sTf4w7GqZ_g0NhkfsjAmCOlyrecBUVf3zeFaFA-k6Q1NRPU_R_gdXSTlFodM-L3QQ';
const device_id = '988c681a-8304-45fb-afbf-9442b8a89827';
const conversation_id = '695eb767-b880-832b-8dba-3762bfdb3f88';
const session_id = 'ad7bf49f-1810-4220-b7fd-4d90a289a865';

const client_version = 'prod-9f5aa1f7b48d4577791d0e660bac1111ba132ee6';

const base_url = 'https://chatgpt.com/';

class Openai extends EventEmitter {
  constructor(opts = {}) {
    super();

    const { logger } = opts;

    this.conversation_id = opts.conversation_id ?? conversation_id;
    this.logger = logger ?? new Logger.SilentLogger();
    this.http2_client = http2_client;

    this.run();
  }

  run() {
    const { http2_client } = this;
    http2_client.createSession(base_url, { keepalive: true });
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

      return { token, seed, difficulty };
    });
  }

  getRequirements() {
    return this.fetchRequirements().then(({ token, seed, difficulty }) => {
      return { proof: solveChallenge(seed, difficulty), token };
    });
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

        const matches = Array.from(/data\: (.*})/g[Symbol.matchAll](data));

        if (!matches.length)
          return logger.warn('sendMessage: matches array is empty'), false;

        const objects = matches.map(match => JSON.parse(match[1]));
        const response = objects[objects.length-2];

        const { message, conversation_id } = response;
        const { id, create_time, update_time, content, status } = message;

        if (1 < content.parts.length)
          exit(content);

        return { content: content.parts.join(' '), took: timer };
      });
    });
  }
}

for (const method of ['get', 'post', 'delete', 'put', 'patch']) {
  Openai.prototype[method] = function (endpoint, body, headers) {
    const { http2_client } = this;
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