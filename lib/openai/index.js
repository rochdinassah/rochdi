// author: rochdi nassah
// created: 2025/11/1

'use strict';

const EventEmitter = require('node:events');
const Logger = require('../logger');
const Http2Client = require('../http2-client');
const endpoints = require('./endpoints');

// test account' credentials
const authorization = 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjE5MzQ0ZTY1LWJiYzktNDRkMS1hOWQwLWY5NTdiMDc5YmQwZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSJdLCJjbGllbnRfaWQiOiJhcHBfWDh6WTZ2VzJwUTl0UjNkRTduSzFqTDVnSCIsImV4cCI6MTc2Mjg1NjYzMywiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7ImNoYXRncHRfY29tcHV0ZV9yZXNpZGVuY3kiOiJub19jb25zdHJhaW50IiwiY2hhdGdwdF9kYXRhX3Jlc2lkZW5jeSI6Im5vX2NvbnN0cmFpbnQiLCJ1c2VyX2lkIjoidXNlci1kcDhuVjZJOGtBSEl3bFRyYzVZMno5N3IiLCJ2ZXJpZmllZF9vcmdfaWRzIjpbIm9yZy1MYUFDWGs2Q0UzQWpva2Y1bFd1YXVydmEiXX0sImh0dHBzOi8vYXBpLm9wZW5haS5jb20vcHJvZmlsZSI6eyJlbWFpbCI6ImdlbmVyYXRvcjQwOTZAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJpYXQiOjE3NjE5OTI2MzMsImlzcyI6Imh0dHBzOi8vYXV0aC5vcGVuYWkuY29tIiwianRpIjoiNzhlMjc1YmEtMWM3Ni00OTNlLWI2ZmEtNDg3OWQ0N2ZjNzM2IiwibmJmIjoxNzYxOTkyNjMzLCJwd2RfYXV0aF90aW1lIjoxNzYxOTkyNjMxNzAxLCJzY3AiOlsib3BlbmlkIiwiZW1haWwiLCJwcm9maWxlIiwib2ZmbGluZV9hY2Nlc3MiLCJtb2RlbC5yZXF1ZXN0IiwibW9kZWwucmVhZCIsIm9yZ2FuaXphdGlvbi5yZWFkIiwib3JnYW5pemF0aW9uLndyaXRlIl0sInNlc3Npb25faWQiOiJhdXRoc2Vzc19OTDlCdWdNcUFxaE1NQUhDRUJucVg5bHciLCJzdWIiOiJnb29nbGUtb2F1dGgyfDEwMzM5OTY0NjA0NTA5NzAwMTc2MSJ9.rkilG4ssnBeltCSFNxVAIZ0VI-J1UdCkhB4xNb2sNGmPUR-v10afRJ_QdDQllkA1wPdXwyqWEUKkwwGFM8Fn2FxJGfO7wU7S-Vuq8z1cWa0Xpxa5CDjn3Xo0m3Hl7M6shdp5Zeyrio0JFq901cW2JQzD6HD_LXrhez_R9viuY6zsrpZeWWOd2kZZmjuSU1IHwfbjwXToM6aknIzw3-AqS2tRUwE0TrLjoSYYUiI7R0dQ36iAiQMAHSyNHNl49-k9egN_UKgBv8lNkqx3uAL4cDAIYj8Wp2iG4ql--MFeYpbEWi9MWyxcnOJCSorI-M1Xv1aAnllP_PuCVTQD56SUbq737N_rfnPrkAiQtdctbHLIsJfAXMvyjZnrxOrfG-YABXp2ViokXki3urGvj50nC76ISlAbwO14QbRN8ge2tEhtUqZxnG1ZaKwnglxqG_lo0HYnxsMgQ8hS2UObNhZ_PfnEPeVnNHG9dDwKJUYzzIyHrc1LDfPuYy2Qpw7fgYUalqqAgF49aAkSNrNFGnUOkcnWoNzRL31v6V5PHYGkF14LYy5kgSLgVp_fjpnRm-zxSIK-z0eOxrKOFYHQeRBiFT66Jew9sLGRPB5Qg2HAmTibZ8Ca1XiWmN6fxZHkT5Ck_FY8ML9qB7Jy-W2O4AdVompCgO7PlW-HGeMQCMziJQI';
const device_id = '988c681a-8304-45fb-afbf-9442b8a89827';
const conversation_id = '6905f170-a814-832d-96f1-abdf1e692440';
const session_id = 'ad7bf49f-1810-4220-b7fd-4d90a289a865';

const client_version = 'prod-9f5aa1f7b48d4577791d0e660bac1111ba132ee6';

const base_url = 'https://chatgpt.com/';

const http2_client = new Http2Client();

class Openai extends EventEmitter {
  constructor() {
    super();

    this.logger = new Logger({ prefix: 'openai' });
    this.http2_client = http2_client;
    this.requirements_generator = new RequirementsGenerator();
  }

  fetch_requirements() {
    const { logger } = this;
    const { url, headers, body } = endpoints.requirements;

    return this.post(url, body, headers).then(res => {
      const { statusCode, data } = res;
      
      if (200 !== statusCode)
        return logger.error('fetch_requirements: request error, http(%d)', statusCode), false;

      const { persona, token, expire_after, expire_at, turnstile, proofofwork } = data;
      const { dx } = turnstile;
      const { seed, difficulty } = proofofwork;

      return { token, seed, difficulty };
    });
  }

  get_requirements() {
    return this.fetch_requirements().then(({ token, seed, difficulty }) => {
      return { proof: this.requirements_generator.generate(seed, difficulty), token };
    });
  }
  
  send_message(content) {
    return this.get_requirements().then(({ proof, token }) => {
      const { url, headers, body } = endpoints.conversation;

      headers['Openai-Sentinel-Proof-Token'] = proof;
      headers['Openai-Sentinel-Chat-Requirements-Token'] = token;

      // exit(headers);

      body.conversation_id = conversation_id;
      body.messages[0].content.parts[0] = content;

      return this.post(url, body, headers);
    });
  }
}

for (const method of ['get', 'post', 'delete', 'put', 'patch']) {
  Openai.prototype[method] = function (endpoint, body, headers) {
    const { http2_client } = this;
    const url = base_url+endpoint.trim('\/');
    headers = {
      ...headers,
      'Authorization': authorization,
      'User-Agent': '',
      'Oai-Device-Id': device_id,
      'Oai-Client-Version': client_version,
      'Origin': base_url.trim('\/')
    };
    if (body)
      headers['Content-Type'] = 'application/json';
    return http2_client[method](url, { headers, body });
  };
}

// all of the methods on "RequirementsGenerator" class are extracted from the original openai asset scripts
class RequirementsGenerator {
  getConfig() {
    return [
      3000,
      String(new Date),
      2248146944,
      Math.random(),
      http2_client.userAgent,
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
  }

  Sp(t) {
    return t[Math.floor(Math.random() * t.length)]
  }

  Oee() {
    return "" + Math.random()
  }

  Ef(t) {
    return t = JSON.stringify(t), btoa(unescape(encodeURIComponent(t)));
  }

  Bee(t) {
    return setTimeout(() => {
      t({
        timeRemaining: () => 1,
        didTimeout: !1
      })
    }, 0), 0;
  }

  Fee() {
    return new Promise(t => { this.Bee(n => { t(n) } , { timeout: 10 }) });
  }

  Ree(t) {
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

  runCheck(e, n, s, o, a) {
    o[3] = a, o[9] = Math.round(performance.now() - e);
    const i = this.Ef(o);
    return this.Ree(n + i).substring(0, s.length) <= s ? i + "~S" : null;
  }

  generate(e, n) {
    const s = performance.now();
    const o = this.getConfig();
    for (let a = 0; a < 5e5; a++) {
      const i = this.runCheck(s, e, n, o, a);
      if (i)
        return 'gAAAAAB'+i;
    }
  }
}

module.exports = Openai;