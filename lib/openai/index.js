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
const conversation_id = '68c4f2ec-599c-8322-826c-9c5a003200a7';

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
    return Promise.resolve('gAAAAABpBe2xExiNky9w5J_BUKSTEbKqYL_VUG20rDsC8dJ1m5mud8JT2ui3o434iF8duWQVs6ORd6YKGBnTzkZuOdh8Eu96gs3liMbKwnu5VcyU7CX1ir1l25RdzWVv3QZWEyEel1eYZt-7f9-JU8ncmTRkjEnoF4x-QcgrFnEu1sg2_SnE-aIZrVq5TZsE8tc81mzux7H8MnPCtMsH10wYFTrso74PWpi-jMdSK_fKojvSqzqx8A_iBxu94dBsFMrV6jX2vOqJr9kqiz-xEouPh4XUqOQ2KApxMDnTQATv4xAhcfBn6_t9CCSSjJ39nbhEjEffcdUrYBitKgG152PEG8XGEFROYQxQFiD8AkkgQoX_IOeCjbMquXuX_OTqeN-aZtnlXKHg08kfCj8XgnDLnJEfQAwDHdt2hLVrAutqjN-ZnzNFOhAvFNZJ3vdt5ue0OR9mctoKCuOlZIVADeitS28k6Vb3_hK40NUawGkcc0_AEBPd4HTPcr0DgGE8t0AO0xNBJztWR7_PAakvTl33dxsAR1p_cBIyL_b0i-YkHtapU8wzkjrkMIwfB4Wj32VXZXgT8r2BjA932HS4N3zWwpd3JhSwtHek0hUmhW17YMl5tsTJy_a9zHcnNY13YOpbEMN7tVpcTsIVrNqhr4Gn-mSTrje8xAFJOwnL28FI02E5O2HGvG3XN1MjaKolCPa44Z7Yp4oT9pk2RCbm1VY-TdKzaGU6Z7nQ1TGpdxxaTYYKsFy02e8uVGAEa6xVbvJFKsDXPEKpMbDk8nW1ggTlHXtoxxC2IUh3Y2UcEwMXnUb7LbJNcMtx_udEyLWBRATmHu1GFtKjZejK1v0xyF0jGCOf2mihOsvhbdErBCQHyMifCdtRcbav0pFeeEXMKd2DIjt1N6c0Rp4BY-O7QHjfchK_hBGKoH7LT-BUpwtMi5UAmi7oEiCKZkEk9OC-9tYb3rI6mHg-yTEcQo12oaEK_sxSoIYQdHBeHMBZeoEkb-4FJcYkZ_q3ZjeFb5LhDpv-6TM5f9QgRCeN87_7bVRwjHvb2DgtyJa4qUbcUhPj3qnwdtcb0jGjqaKh54EzoVj3S3nfRpbZuwOToyU8fD-0kNGlpM84xLEHX1tPCq-B6V4vt92VuNuRu-zEGu8JaQGcJR8ydBdlbrpU63XjzbbjLwzNYHJ85-aPSYrXVzyJbDqqBwdknQza6t9TtHgwegdz7m9AjK5Iw0WcsZOBqZsVLiI3AxQBnwCHRtxR5xswkmflHxG7QHuC5bMiB1BkTCYc6Rp3n22uM9au-5rYqHxlGsYLvkF2bwe3QmwBnuhyM8ogmxkDtX1x-9bYXXwFVOAPpmUnyssirfc30vTESEL_-SvaycSx7ZpDnpHmikcC_4Z9YrTMy2x__qv_ilS5Qb01syzvnLFO1kMQ-qDhXksQIhnwhmc9c_ZT-494soFTLtLON3M6S0QivbNZGvAQZmlOzBj9auOmFPMqG5RL44xPgVIrYERojV-A0FNAhmaBdifD1c3xB9sKVlqpH-7FQnvPoyHYJ-g0s890qKwOSOaHMbgEwBuCRWo0VdunibPjdjbSfPDNX2Sp7PA8uY2wo8_pozHW9S4kMRFOcl-b07K63qsQ_FWs4-tZKy1pF9NrfkBDUuWtf-opYvhGF730Oi6HwVG7FKtDmOy84OrLN6q2kGidwXzlGDlCmeuB0S6BDyHqJXwzB47kg3ww2o_YJh0sPXi1d-OEGHSQJbRKagTytTPw8dvcy7VA7i7YiVE3o-xFc1WBUprtaWyKmRyKgsiyxkLP-2lDvUy-awUAsiXWYPMSC8i4acm1EBJAy1OWKlRwXf8irgZHnGL3mrR7FFF0HW0IokctgAQdJcZ4gykT4bIz6hEFlHGCdhggmFbpvjx_hINEpaCMdAwpGtli41SAJiHsyV7rO5Bh-Ub2KJ_smZMMaOBNgfMfXdrHUW1Lj3OHKMqCH27uZUY29PqYzFQ-NWkF8RUF7P6vi8PiQCQ22WQXzHtABBU6dphIF8Rm18SksvU38ICLtNgfPUxxToHoS_Bq0-2_PqD85sayRbHUOWHv8PBt7g==');
  }
  
  send_message(content) {
    return this.get_requirements().then(token => {
      const { url, headers, body } = endpoints.conversation;
      body.conversation_id = conversation_id;
      body.messages[0].content.parts[0] = content;
      exit(url, body);
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

module.exports = Openai;