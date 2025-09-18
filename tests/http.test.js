// author: rochdi nassah
// created: 2025/09/19

'use strict';

const rochdi = require('rochdi');

const { HttpClient, Http2Client } = rochdi;

const httpClient = new HttpClient();
const http2Client = new Http2Client();

const endpoint = {
  url: 'https://ifconfig.co',
  headers: {
    'user-agent': 'curl'
  }
};

const { url, headers } = endpoint;

test('http/1.1 basic test', async () => {
  expect(await httpClient.get(url, { headers }).then(res => res.statusCode)).toBe(200);
  expect(await http2Client.get(url, { headers, keepalive: false }).then(res => res.statusCode)).toBe(200);
});