// author: rochdi nassah
// created: 2025/09/18

'use strict';

const rochdi = require('../../');

const { HttpClient } = rochdi;

const httpClient = new HttpClient();

const user = process.env.WIFI_ROUTER_USER;
const pass = process.env.WIFI_ROUTER_PASS;

function getRandCount() {
  const url = 'http://192.168.1.1/asp/GetRandCount.asp';
  return httpClient.post(url, { headers: { 'content-length': 0 } }).then(res => {
    const { statusCode, data } = res;
    if (200 !== statusCode)
      exit('getRandCount: request error, http(%d)', statusCode);
    return data.trim() === data;
  });
}

getRandCount().then(log);