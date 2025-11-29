// author: rochdi nassah
// created: 2025/09/19

'use strict';

const rochdi = require('rochdi');

const { HttpClient, Http2Client } = rochdi;

const http_client = new HttpClient();
const http2_client = new Http2Client();

const endpoint = {
  url: 'https://ifconfig.co',
  headers: {
    'user-agent': 'curl'
  },
  retry_on_error: 2**8
};

const { url, headers, retry_on_error } = endpoint;

test('http clients basic test', async () => {
  expect(await http_client.get(url, { headers, retry_on_error }).then(res => res.status_code)).toBe(200);
  expect(await http2_client.get(url, { headers, retry_on_error, keepalive: false }).then(res => res.status_code)).toBe(200);
});