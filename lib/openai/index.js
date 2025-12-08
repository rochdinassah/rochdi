// author: rochdi nassah
// created: 2025/11/1

'use strict';

const EventEmitter = require('node:events');
const Logger = require('../logger');
const Http2Client = require('../http2-client');
const endpoints = require('./endpoint');

const http2_client = new Http2Client();

// test account' credentials
const authorization = 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjE5MzQ0ZTY1LWJiYzktNDRkMS1hOWQwLWY5NTdiMDc5YmQwZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSJdLCJjbGllbnRfaWQiOiJhcHBfWDh6WTZ2VzJwUTl0UjNkRTduSzFqTDVnSCIsImV4cCI6MTc2NjA0MzQxOCwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7ImNoYXRncHRfY29tcHV0ZV9yZXNpZGVuY3kiOiJub19jb25zdHJhaW50IiwiY2hhdGdwdF9kYXRhX3Jlc2lkZW5jeSI6Im5vX2NvbnN0cmFpbnQiLCJ1c2VyX2lkIjoidXNlci1kcDhuVjZJOGtBSEl3bFRyYzVZMno5N3IifSwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9wcm9maWxlIjp7ImVtYWlsIjoiZ2VuZXJhdG9yNDA5NkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sImlhdCI6MTc2NTE3OTQxNywiaXNzIjoiaHR0cHM6Ly9hdXRoLm9wZW5haS5jb20iLCJqdGkiOiI1MGIzYWNjMC1mZmU3LTQ4ODMtYTZhOS1kOTgxNzNhNDY0MGQiLCJuYmYiOjE3NjUxNzk0MTcsInB3ZF9hdXRoX3RpbWUiOjE3NjUxNzk0MTY3NzgsInNjcCI6WyJvcGVuaWQiLCJlbWFpbCIsInByb2ZpbGUiLCJvZmZsaW5lX2FjY2VzcyIsIm1vZGVsLnJlcXVlc3QiLCJtb2RlbC5yZWFkIiwib3JnYW5pemF0aW9uLnJlYWQiLCJvcmdhbml6YXRpb24ud3JpdGUiXSwic2Vzc2lvbl9pZCI6ImF1dGhzZXNzX2tWbXprVzBvRmlKNE8wTGUzbDJlWVB4ZyIsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTAzMzk5NjQ2MDQ1MDk3MDAxNzYxIn0.dyB36GAP6dcppLhr4VhdCk50BKouxp7sMvikTUaimQE2z_T5nuAkc6BDr4vQmDQM-HnF4uYcd0ApWpG0jbyCEjTn2Egao601oTGKhE2ej5lqswWH_ej3rRB9TaCQxeRm7ooB30JI15fRxN5FwnsKsDwN0a41HZnaobpghiAsb4yvH-dmDTT6TqqjIUIdhvB-SuQDoWbyyKq-3r4gCOkpdwn-F7QmR-gSjEtjqhRJLCYy5EbgkrSj-qPQSVSt5z0ESO-yje_l-pmNKoakSZ_OKzg_CE_nzbmL9D0c-vNk4yrAT2wxKaCdzxMjaVxbBYxgodICgG7Soo6GfHYxtQ5rgGryM-HjpAGFsxfS_5couw_w9wODEeqcsp3iftepE_lwTS5en7emQkECkz_zY6Nu2mRHADCmQlUTjvxKHKeV3LjJbpHPO1YGS7Scj-TOu7QO_RKqAZoOeEJ7JlODYMloG-3PDleVbtoVqLr_psis_l_nDmvumjG-8lOxHdahYjyxulx1H5U1XJAoIvI9LOSezU7vTrGs_1AiMghH41yDSvHTFg7q8RO4PLJLXSpchrCasAdZgHWvjlzmlt1qNE0uLCwsjoGUYACEHeeHRxQdLmQZ-dQPMEEshzWq0EdwhToYEkhGEsU3-eRW6YXyKcGunMEekV_j6_79XXes562y5P8';
const device_id = '988c681a-8304-45fb-afbf-9442b8a89827';
const conversation_id = '6905f170-a814-832d-96f1-abdf1e692440';
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

// the challenge solving implementation is extracted as it is from the original openai asset
// challenge solving start
const config = [
  3000,
  String(new Date),
  2248146944,
  Math.random(),
  http2_client.user_agent,
  null,
  client_version,
  "en-US",
  "en-US",
  Math.random(),
  "registerProtocolHandler−function registerProtocolHandler() { [native code] }",
  "_reactListening0f5ei7cc0ye8",
  "oncancel",
  977.5,
  session_id,
  '',
  8,
  performance.timeOrigin
];
function solveChallenge(seed, difficulty) {
  const s = performance.now();
  const o = config;
  for (let a = 0; a < 5e5; a++) {
    const i = rc(s, seed, difficulty, o, a);
    if (i)
      return 'gAAAAAB'+i;
  }
}
function rc(e, n, s, o, a) {
  o[3] = a, o[9] = Math.round(performance.now() - e);
  const i = ef(o);
  return re(n + i).substring(0, s.length) <= s ? i + "~S" : null;
}
function ef(t) {
  return t = JSON.stringify(t), btoa(unescape(encodeURIComponent(t)));
}
function be(t) {
  return setTimeout(() => { t({ tr: () => 1, dt: !1 }) }, 0), 0;
}
function fe() {
  return new Promise(t => { be(n => { t(n) } , { tt: 10 }) });
}
function re(t) {
  let e = 2166136261;
  for (let n = 0; n < t.length; n++)
    e ^= t.charCodeAt(n),
    e = Math.imul(e, 16777619) >>> 0;
  return e ^= e >>> 16,
    e = Math.imul(e, 2246822507) >>> 0,
    e ^= e >>> 13,
    e = Math.imul(e, 3266489909) >>> 0,
    e ^= e >>> 16,
    (e >>> 0).toString(16).padStart(8, "0");
}
// challenge solving end

module.exports = Openai;