'use strict';

const log = console.log.bind(console);

const Http2Client = require('../http2-client');
const helpers = require('../helpers');
const generateProofToken = require('./script');

const { startTimer, endTimer } = helpers;

// token, device id, and conversation id are deliberately put here for testing purposes and they are supposed to be valid
const DEFAULT_AUTH_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE5MzQ0ZTY1LWJiYzktNDRkMS1hOW\
QwLWY5NTdiMDc5YmQwZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSJ\
dLCJjbGllbnRfaWQiOiJhcHBfWDh6WTZ2VzJwUTl0UjNkRTduSzFqTDVnSCIsImV4cCI6MTc1ODYwMTY3OCwia\
HR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7InVzZXJfaWQiOiJ1c2VyLWRwOG5WNkk4a0FISXdsVHJjNVk\
yejk3ciJ9LCJodHRwczovL2FwaS5vcGVuYWkuY29tL3Byb2ZpbGUiOnsiZW1haWwiOiJnZW5lcmF0b3I0MDk2Q\
GdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwiaWF0IjoxNzU3NzM3Njc3LCJpc3MiOiJodHRwczo\
vL2F1dGgub3BlbmFpLmNvbSIsImp0aSI6ImRlZjVlMjcxLTNjZTctNGQ4MS1hYmUxLTkxZGQzMTE5Yjc0ZCIsI\
m5iZiI6MTc1NzczNzY3NywicHdkX2F1dGhfdGltZSI6MTc1NzczNzY3NjU1Niwic2NwIjpbIm9wZW5pZCIsImV\
tYWlsIiwicHJvZmlsZSIsIm9mZmxpbmVfYWNjZXNzIiwibW9kZWwucmVxdWVzdCIsIm1vZGVsLnJlYWQiLCJvc\
mdhbml6YXRpb24ucmVhZCIsIm9yZ2FuaXphdGlvbi53cml0ZSJdLCJzZXNzaW9uX2lkIjoiYXV0aHNlc3NfUXZ\
sYUJ4VUNadU42MEozamJicXE0dEZOIiwic3ViIjoiZ29vZ2xlLW9hdXRoMnwxMDMzOTk2NDYwNDUwOTcwMDE3N\
jEifQ.J0gDraJD5eRefeSYO4N9PgZe3149ZIx4lZF0zKBZHD6K5ReUCnyDr07h_rJ7gn3ZhqGeEUM4vyyntykc\
8CfwxLld5aUw1lttdxtGOisQn0D6-RB32w4VDnzDO4OA06Gw_H3JykG4tCYwNTQAMSvN2E50Ig4tIBGwEpoGd2\
uJOhRbFHvRgETCe7x_uAFwvHPMV1p8H8ZT5JoDuRA27ySwfeAU8B3rYRVApqNZI102lzTuD1CispkTeImEmCNN\
xFPhobyowQNvBZzMZpmHzjpTvHr5f0uY3382hq_UJ1jDMCgaNYbgoJuptFKzlEz8grfEm8dHbiJc0HHhP8NpDF\
-g0EI30HD6oHjnhA3vOI5T7-x_NOvY5QffGFFUCh4-X8Okz4ZWQ4T7hN455NzVhIafNI8NKsz4TfL5IrUpzVDm\
aXzMtohXSPD_BroaZXcjX-Jb3Tf73VT_9RR1Wb0ibNl7xh4h_L14TXt8Kf6_JmkaJYS_U45YsJXZdaNUr7k0HP\
uyDPm7dFagdxAA___t6x4wznUt5UpUsBmjGTEts5WqIcbDJaVaTEC0NI7WiDFfeWAVDhPocuW6bMNlKENnqP_k\
Ibr6FnQUgq91A7gNcCRwR9_bhYLOTNKa2Xhc-0JvfNXyKR3CGJCY8Mm8n_mznFKpBCEjuE3KuLbXX3mv0tyat0g';
const DEFAULT_DEVICE_ID = 'cc718b67-dee8-43c7-a3f7-725bcf6b9b1f';
const DEFAULT_CONVERSATION_ID = '68c4f2ec-599c-8322-826c-9c5a003200a7';

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
const CLIENT_VERSION = 'prod-6130682b757d3390ff7f45a20897cd2a1b442c48';
const AUTH_TOKEN = process.env.OPENAI_AUTH_TOKEN ?? DEFAULT_AUTH_TOKEN;
const DEVICE_ID = process.env.OPENAI_DEVICE_ID ?? DEFAULT_DEVICE_ID;
const CONVERSATION_ID = process.env.OPENAI_CONVERSATION_ID ?? DEFAULT_CONVERSATION_ID;

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