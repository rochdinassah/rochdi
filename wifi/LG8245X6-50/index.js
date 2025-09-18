// author: rochdi nassah
// created: 2025/09/18

'use strict';

const rochdi = require('../../');

const { HttpClient } = rochdi;

const httpClient = new HttpClient();

const user = process.env.WIFI_ROUTER_USER;
const pass = process.env.WIFI_ROUTER_PASS;

function getToken() {
  const url = 'http://192.168.1.1/asp/GetRandCount.asp';
  return httpClient.post(url, { headers: { 'content-length': 0 } }).then(res => {
    const { statusCode, data } = res;
    if (200 !== statusCode)
      exit('getToken: request error, http(%d)', statusCode);
    return log('token ok'), data.trim();
  });
}

function login(user, pass) {
  return getToken().then(token => {
    user = encodeURIComponent(user);
    pass = encodeURIComponent(btoa(pass));

    const url = 'http://192.168.1.1/login.cgi';
    const body = 'UserName='+user+'&PassWord='+pass+'&Language=english&x.X_HW_Token='+token;
    const headers = {
      'cookie': 'Cookie=body:Language:english:id=-1',
      'accept-encoding': 'gzip, deflate, br',
      'content-type': 'application/x-www-form-urlencoded'
    };

    return httpClient.post(url, { headers, body }).then(res => {
      const { statusCode, headers, data } = res;
      if (200 !== statusCode)
        exit('login: request error, http(%d)', statusCode);
      const cookie = headers['set-cookie'];
      if (!cookie || !cookie.length)
        exit('login: did not receive set-cookie header');
      const match = /(CookieHttp\=sid\=[a-z0-9]+\:Language\:english\:id\=1);path\=\/;HttpOnly/.exec(cookie[0]);
      if (!match[1])
        exit('login: did not receive CookieHttp');
      return log('login ok'), match[1];
    });
  });
}

function getToken2(cookie) {
  return httpClient.get('http://192.168.1.1/html/ssmp/accoutcfg/ontmngt.asp', { headers: { cookie } }).then(res => {
    const { statusCode, data } = res;
    if (200 !== statusCode)
      exit('getToken2: request error, http(%d)', statusCode);
    const match = /[a-z0-9]{64}/.exec(data);
    if (!match[0])
      exec('getToken2: token extraction error');
    return log('token2 ok'), match[1];
  })
}

return login(user, pass).then(cookie => {
  getToken2(cookie);
});

getToken2('CookieHttp=sid=7897fb0e704ab2d98003b0327d436063b76a58e7cdb056473dbcc469951360d7:Language:english:id=1');