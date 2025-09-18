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
    return data.trim()
  });
}

function login(user, pass) {
  getRandCount().then(token => {
    user = encodeURIComponent(user);
    pass = encodeURIComponent(btoa(pass));

    const url = 'http://192.168.1.1/login.cgi';
    const body = 'UserName='+user+'&PassWord='+pass+'&Language=english&x.X_HW_Token='+token;
    const headers = {
      'cookie': 'Cookie=body:Language:english:id=-1',
      'accept-encoding': 'gzip, deflate, br',
      'content-type': 'application/x-www-form-urlencoded'
    };

    const regexp = /(CookieHttp\=sid\=[a-z0-9]+\:Language\:english\:id\=1;path\=\/;HttpOnly)/;
    const cookie = 'CookieHttp=sid=9a8b8618ae442532feaa85c2f76f07b36eb896d2abb460aa47a5d1a6dd170df0:Language:english:id=1;path=/;HttpOnly';

    exit(regexp.exec(cookie));

    return;

    return httpClient.post(url, { headers, body }).then(res => {
      const { statusCode, headers, data } = res;
      if (200 !== statusCode)
        exit('login: request error, http(%d)', statusCode);
      exit(res);
    });
  }); 
}

login(user, pass);