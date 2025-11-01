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

const client_version = 'prod-9f5aa1f7b48d4577791d0e660bac1111ba132ee6';

const base_url = 'https://chatgpt.com/';

class Openai extends EventEmitter {
  constructor() {
    super();

    this.logger = new Logger({ prefix: 'openai' });
    this.http2_client = new Http2Client({ logger: this.logger });
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
    });
  }

  get_requirements() {
    return Promise.resolve('gAAAAABWzMwMDAsIlNhdCBOb3YgMDEgMjAyNSAxMjo0MDo1NCBHTVQrMDEwMCAoR01UKzAxOjAwKSIsMjI0ODE0Njk0NCwyMCwiTW96aWxsYS81LjAgKFgxMTsgTGludXggeDg2XzY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTQwLjAuMC4wIFNhZmFyaS81MzcuMzYiLCJodHRwczovL3d3dy5nb29nbGV0YWdtYW5hZ2VyLmNvbS9ndGFnL2pzP2lkPUctOVNIQlNLMkQ5SiIsInByb2QtOWY1YWExZjdiNDhkNDU3Nzc5MWQwZTY2MGJhYzExMTFiYTEzMmVlNiIsImVuLVVTIiwiZW4tVVMsZnItRlIiLDIsImNyZWRlbnRpYWxz4oiSW29iamVjdCBDcmVkZW50aWFsc0NvbnRhaW5lcl0iLCJsb2NhdGlvbiIsIkREX1JVTSIsMjU1NTc3OC4xOTk5OTk5OTk3LCJjNWJlNDkwYi00YzAwLTRkMjMtYWVjYi1lNTQ4MzMyNWMxMmUiLCIiLDgsMTc2MTk5NDY5ODgyNi4yXQ==~S');
  }
  
  send_message(content) {
    return this.get_requirements().then(token => {
      const { url, headers, body } = endpoints.conversation;

      headers['Openai-Sentinel-Proof-Token'] = token;
      headers['Openai-Sentinel-Chat-Requirements-Token'] = 'gAAAAABpBfHGANqQ7b_BBzeDRRAw42_WPvZ39CjtsIpttOXHC_NMFhV4Ln766bklw2EPR7FyN3TMrGpNtVoz-UX-pPAZmdB0UV_sZ4t6IuyNc7dPQ-JR0FRgNCsZRYd_HC0OaoJPaSzHvWtQjnuuO9XWniqLAfIVcIOgvxgnLaMuWxejCfa4BUraP7MT0oZsecD0RshqYu3a0nkmIB0ZI3eD1zakqc2f1Fm5aBY0oHt2ynH0cXru6eCaOQ3HBzgSC8Nrp3P_62cCSuKTBbJI21fIPZKJNAVhnPJ3mV2dLxN6XmD_7hJHo-d8rsWBs40pX-fOHhVnJDN4uaBJ2S2mq83H27fJSZI-oQwXz74op7BjxqJO4fu8AUQSc_PpV8iW1OyD8C2cz0HQJY0CT3tgaBJeAseaArK_dv_bOT4871B7CpXrG7lfOkZVXFZNs_MXKMPxwUIHac8cpj2yZTM8vJTc7v2bMnHs00OjuXGe_yXtZ7nKpbWyYqBsi0Y3_ZcV7HW0ibeK6CYX74krlnlCXJW87BL9eYeCYT4PcXquHiPGtLXvw5ZbrGe0PXcw_WY3WUulj4nkHR6HXa1AvFJyLFX4b8WyK-MOJWNg_UBCwaRFtc0uua1LqJ5yXlYmcsOU60vE6xCJL0PEkLa1j77QIRiO3qH-VOZa7MeC_4r-ETQe-NUtfucuRqmWAnFxVb-URQ8Qkr4Zt1pmSPr7tFDOPSHRNGNeaA33_90JXP9HgVQl4Tf0lRPP095L8yvNFCu48AwibYm8zLbnrT3HvbdXzWLF-SIgMf2jslZxq4PvwcRheJKqN20xaNS6yX1ggAgvgT3sglhFw6but-bXiWVGeLTa8hwDi9tDxXJyWsBXsiEg1FCYB5Pck23M0MdR_j3ihe6U2ygxchCfr3S2rQiPvB9QwJEqTMDCVoISaWOLu89G6t-153WuAlsE0agMZgfPUE1556kr2Hc2qd0SfpRoW18KmHysmLsjCUL8V_l92aGhYQneJUhwCYNmcb_KMoaI9TrihYF5fZiOQe3lzFvsz2_bLwPjXYPlL-oLcHcP9ZtWM_rPOVSHqoSEv24BgXPHgxj46AYzTHDx8FM-XKBOZDr-b2r9is_AeJ16R-ABepF02Sj_nl1dqs45XDdl3LEXUIoJv9oROINcDZq1wFP743R1cXIK38w_6U-I0Za_PoI4E96y2zgOuGVooENDs9ScjO1BoXuG1zfIkrky_KbU_wbFC2XPZiQ2W2nvQz3V4UiuQG9oUjrJaDB4lbvUVWpie-t06ajfyox5pjFfe0uUOpjFQ4xzbdyzFoBeCUtyVPjZMIiT51UXK0cgWIBDIEu38cRmap3kcrUNrHkUp1L2aFK4FaqJ-JoqlslgvV80vCZ0rGPb2ekKh6NsJFssL6u5Q0yHjwu8IESpKJfOTnH5EjEB5EAUrrlxKgz69r0anqqnsib-BJheN7w-jXMCvn9ikrHBohf_78-JPHyTN1CbqM5Scn57PGIU12w-G9W103LrFGpJZUIawh-zTxc4rkh8gEZxYY7N885-k9jppd9SCluriB171BjjtDDexBL3rvU6P_0oqVhZTUDCm1vD7AZz1rBHVeFBs4DIOmUtkYp3r4hU7ST-LAphrHb8cM1agG9wn6L5tC6v9Ybl9GKCQfYcrenZloolMB7Og6xatDI5lEq1TF-wNcFSsVpucEbUN1qH4u8p1wsS_FCD-ixEhaVSH6zcAHTPR4OcMiUFaVrkAttY2oiNXs9la-SSshws5sD4luayh7f4vE7XOMpCeKG_PTPzED5LmasCapcspa-NlDh-x4mbufcbN6e3PePiorWwlcVCQr3WzF-x9eIGYvP3OPh3wc43OL9wxl4BBbdg7eTn0_hzjic6Z75yLeJ2RtpSpyph6kMDdv9QhmDLXT-LmBuyXfo6lqdx3IiC3oivDQ4a5RyoR3ALTvxxKyb7PicWccVuqKwSJhDJv5i8-3l5XcjDkzcqgYXkPT6ihEDB7WdIEPK0yDNH8g=='

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

// all of the methods on "ProcessRequirements" class are extracted from the original openai asset scripts
class ProcessRequirements {
  constructor() {

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
    return new Promise(t => { this.Bee(n => { t(n) } , { timeout: 10 })} );
  }
}

module.exports = Openai;