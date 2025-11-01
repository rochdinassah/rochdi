// author: rochdi nassah
// created: 2025/11/1

'use strict';

const EventEmitter = require('node:events');
const Logger = require('../logger');
const Http2Client = require('../http2-client');

// test account' credentials
const authorization = 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjE5MzQ0ZTY1LWJiYzktNDRkMS1hOWQwLWY5NTdiMDc5YmQwZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSJdLCJjbGllbnRfaWQiOiJhcHBfWDh6WTZ2VzJwUTl0UjNkRTduSzFqTDVnSCIsImV4cCI6MTc2Mjg1NjYzMywiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7ImNoYXRncHRfY29tcHV0ZV9yZXNpZGVuY3kiOiJub19jb25zdHJhaW50IiwiY2hhdGdwdF9kYXRhX3Jlc2lkZW5jeSI6Im5vX2NvbnN0cmFpbnQiLCJ1c2VyX2lkIjoidXNlci1kcDhuVjZJOGtBSEl3bFRyYzVZMno5N3IiLCJ2ZXJpZmllZF9vcmdfaWRzIjpbIm9yZy1MYUFDWGs2Q0UzQWpva2Y1bFd1YXVydmEiXX0sImh0dHBzOi8vYXBpLm9wZW5haS5jb20vcHJvZmlsZSI6eyJlbWFpbCI6ImdlbmVyYXRvcjQwOTZAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJpYXQiOjE3NjE5OTI2MzMsImlzcyI6Imh0dHBzOi8vYXV0aC5vcGVuYWkuY29tIiwianRpIjoiNzhlMjc1YmEtMWM3Ni00OTNlLWI2ZmEtNDg3OWQ0N2ZjNzM2IiwibmJmIjoxNzYxOTkyNjMzLCJwd2RfYXV0aF90aW1lIjoxNzYxOTkyNjMxNzAxLCJzY3AiOlsib3BlbmlkIiwiZW1haWwiLCJwcm9maWxlIiwib2ZmbGluZV9hY2Nlc3MiLCJtb2RlbC5yZXF1ZXN0IiwibW9kZWwucmVhZCIsIm9yZ2FuaXphdGlvbi5yZWFkIiwib3JnYW5pemF0aW9uLndyaXRlIl0sInNlc3Npb25faWQiOiJhdXRoc2Vzc19OTDlCdWdNcUFxaE1NQUhDRUJucVg5bHciLCJzdWIiOiJnb29nbGUtb2F1dGgyfDEwMzM5OTY0NjA0NTA5NzAwMTc2MSJ9.rkilG4ssnBeltCSFNxVAIZ0VI-J1UdCkhB4xNb2sNGmPUR-v10afRJ_QdDQllkA1wPdXwyqWEUKkwwGFM8Fn2FxJGfO7wU7S-Vuq8z1cWa0Xpxa5CDjn3Xo0m3Hl7M6shdp5Zeyrio0JFq901cW2JQzD6HD_LXrhez_R9viuY6zsrpZeWWOd2kZZmjuSU1IHwfbjwXToM6aknIzw3-AqS2tRUwE0TrLjoSYYUiI7R0dQ36iAiQMAHSyNHNl49-k9egN_UKgBv8lNkqx3uAL4cDAIYj8Wp2iG4ql--MFeYpbEWi9MWyxcnOJCSorI-M1Xv1aAnllP_PuCVTQD56SUbq737N_rfnPrkAiQtdctbHLIsJfAXMvyjZnrxOrfG-YABXp2ViokXki3urGvj50nC76ISlAbwO14QbRN8ge2tEhtUqZxnG1ZaKwnglxqG_lo0HYnxsMgQ8hS2UObNhZ_PfnEPeVnNHG9dDwKJUYzzIyHrc1LDfPuYy2Qpw7fgYUalqqAgF49aAkSNrNFGnUOkcnWoNzRL31v6V5PHYGkF14LYy5kgSLgVp_fjpnRm-zxSIK-z0eOxrKOFYHQeRBiFT66Jew9sLGRPB5Qg2HAmTibZ8Ca1XiWmN6fxZHkT5Ck_FY8ML9qB7Jy-W2O4AdVompCgO7PlW-HGeMQCMziJQI';
const device_id = '988c681a-8304-45fb-afbf-9442b8a89827';
const conversation_id = '68c4f2ec-599c-8322-826c-9c5a003200a7';

const base_url = 'https://chatgpt.com/';

const endpoints = {
  conversation: {
    url: '/backend-api/f/conversation',
    headers: {
      'Host': 'chatgpt.com',
      'Cookie': '',
      'Content-Length': '915',
      'Oai-Language': 'en-US',
      'Sec-Ch-Ua-Platform': '"Linux"',
      'Authorization': '',
      'X-Conduit-Token': '',
      'Sec-Ch-Ua-Full-Version-List': '"Chromium";v="140.0.7339.185", "Not=A?Brand";v="24.0.0.0", "Google Chrome";v="140.0.7339.185"',
      'Sec-Ch-Ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
      'Sec-Ch-Ua-Bitness': '"64"',
      'Sec-Ch-Ua-Model': '""',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Arch': '"x86"',
      'Openai-Sentinel-Proof-Token': '',
      'Sec-Ch-Ua-Full-Version': '"140.0.7339.185"',
      'Accept': 'text/event-stream',
      'Content-Type': 'application/json',
      'Oai-Client-Version': 'prod-9f5aa1f7b48d4577791d0e660bac1111ba132ee6',
      'Oai-Echo-Logs': '0,7697,1,9509,0,18521,1,19728,0,27260,1,35133,0,54731',
      'Openai-Sentinel-Chat-Requirements-Token': '',
      'Oai-Device-Id': '',
      'User-Agent': '',
      'Sec-Ch-Ua-Platform-Version': '"6.14.0"',
      'Origin': 'https://chatgpt.com',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7',
      'Priority': 'u=1, i'
    },
    body: {
      action: 'next',
      conversation_id: conversation_id,
      model: 'auto',
      messages: [{
        role: 'user',
        content: {
          content_type: 'text',
          parts: ['echo this number 2974938749283']
        }
      }]
    }
  }
};

class Openai extends EventEmitter {
  constructor() {
    super();

    this.logger = new Logger({ prefix: 'openai' });
    this.http2_client = new Http2Client({ logger: this.logger });
  }
  
  send_message(content) {

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
      'Oai-Device-Id': device_id
    };
    if (body)
      headers['Content-Type'] = 'application/json';
    return http2_client[method](url, { headers, body });
  };
}

module.exports = Openai;