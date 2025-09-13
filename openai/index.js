'use strict';

const log = console.log.bind(console);

const Http2Client = require('../lib/http2-client');
const helpers = require('../lib/helpers');
const generateProofToken = require('./script');

const { startTimer, endTimer } = helpers;

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
const CLIENT_VERSION = 'prod-6130682b757d3390ff7f45a20897cd2a1b442c48';
const AUTH_TOKEN = process.env.OPENAI_AUTH_TOKEN ?? exit('OPENAI_AUTH_TOKEN is missing from .env');
const DEVICE_ID = process.env.OPENAI_DEVICE_ID ?? exit('OPENAI_DEVICE_ID is missing from .env');
const CONVERSATION_ID = process.env.OPENAI_CONVERSATION_ID ?? exit('OPENAI_CONVERSATION_ID is missing from .env');

const http2Client = new Http2Client({ retryOnError: true, userAgent: USER_AGENT });

let counter = -1, requirements, requirementsCacheTimeoutId;

function parseResponseData(data) {
  const matches = Array.from(data.matchAll(/data:(\s\{.*\})/ig)).map(m => JSON.parse(m[1]));
  const { message, conversation_id } = matches[matches.length-2];
  return { conversation_id, content: message.content.parts[0] };
}

const endpoints = {
  requirements: {
    url: 'https://chatgpt.com/backend-api/sentinel/chat-requirements',
    cipher: 'AES128-GCM-SHA256',
    headers: {
      'Host': 'chatgpt.com',
      'User-Agent': 'Mozilla',
      'Oai-Device-Id': DEVICE_ID,
      'Oai-Client-Version': CLIENT_VERSION,
      'Authorization': 'Bearer '+AUTH_TOKEN,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br'
    }
  },
  conversation: {
    url: 'https://chatgpt.com/backend-api/f/conversation',
    cipher: 'AES128-GCM-SHA256',
    headers: {
      'Host': 'chatgpt.com',
      'Sec-Ch-Ua-Platform': '"Linux"',
      'Authorization': 'Bearer '+AUTH_TOKEN,
      'Openai-Sentinel-Chat-Requirements-Token': void 0,
      'Accept': 'text/event-stream',
      'Content-Type': 'application/json',
      'Oai-Device-Id': DEVICE_ID,
      'Oai-Client-Version': CLIENT_VERSION,
      'User-Agent': 'Mozilla',
      'Openai-Sentinel-Proof-Token': void 0,
      'accept-encoding': 'gzip, deflate, br',
      'Priority': 'u=1, i'
    },
    body: {
      action: 'next',
      messages: [{ id: void 0, author: { role: 'user' }, content: { content_type: 'text', parts: [] } }],
      conversation_id: CONVERSATION_ID,
      parent_message_id: void 0,
      model: 'auto'
    }
  }
};

function getRequirements() {
  if (requirements) {
    clearTimeout(requirementsCacheTimeoutId);
    const { token, proofToken } = requirements;
    return requirements = void 0, log('Pulled requirements from cache'), Promise.resolve({ token, proofToken });
  }

  log('fetching requirements...');

  const { url, headers, cipher } = endpoints.requirements;
  return http2Client.post(url, { headers, cipher }).then(({ statusCode, data }) => {
    if (200 !== statusCode)
      throw new Error('getRequirements: request error /chat-requirements, http('+statusCode+')');

    log('requirements fetch ok');

    const { token, proofofwork, expire_at, expire_after } = data;
    const { seed, difficulty } = proofofwork;
    
    const exp = new Date(Number(expire_at+''+expire_after))-new Date();

    return generateProofToken(seed, difficulty).then(proofToken => new Object({ token, proofToken, exp }));
  });
}

module.exports.sendMessage = async function sendMessage(content) {
  const timerLabel = 'conversation::'+(++counter);

  startTimer(timerLabel);

  return getRequirements().then(({ token, proofToken }) => {
    const { url, headers, cipher, body } = endpoints.conversation;

    headers['Openai-Sentinel-Chat-Requirements-Token'] = token;
    headers['Openai-Sentinel-Proof-Token'] = proofToken;

    body.messages[0].content.parts = Array.isArray(content) ? content : [content];

    // exit(headers);
    
    return http2Client.post(url, { headers, body, cipher, retryOnError: false })
      .catch(() => exports.sendMessage(content))
      .then(({ statusCode, data }) => {
        if (200 !== statusCode)
          throw new Error('request error /conversation, http('+statusCode+')');

        if (!requirements) {
          clearTimeout(requirementsCacheTimeoutId);
          getRequirements().then(({ token, proofToken, exp }) => {
            requirementsCacheTimeoutId = setTimeout(() => (requirements = void 0, log('Invalidated requirements from cache')), exp-6e4);
            requirements = { token, proofToken };
            log('Cached requirements');
          });
        }

        return { ...parseResponseData(data), took: endTimer(timerLabel) };
      });
  });
};