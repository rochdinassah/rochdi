'use strict';

const log = console.log.bind(console);

const helpers = require('../../lib/helpers');
const { format } = require('node:util');

const HttpClient = require('../../lib/http-client');
const { fetchIpAddress, awaitInternet } = helpers;

const httpClient = new HttpClient({ retryOnErro: false });

const username = encodeURIComponent(process.env.WIFI_ROUTER_USERNAME);
const password = encodeURIComponent(btoa(process.env.WIFI_ROUTER_PASSWORD));

const authority = 'http://192.168.1.1';
const makeUrl = path => authority+path;
const endpoints = {
  token: {
    url: makeUrl('/asp/GetRandCount.asp'),
    headers: {
      'Content-Length': '0',
      'Accept-Encoding': 'gzip, deflate, br',
    }
  },
  login: {
    url: makeUrl('/login.cgi'),
    headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cookie': 'Cookie=body:Language:english:id=-1',
    }
  },
  token2: {
    url: makeUrl('/html/ssmp/accoutcfg/ontmngt.asp'),
    headers: {
      'Accept-Encoding': 'gzip, deflate, br'
    }
  },
  restart: {
    url: makeUrl('/html/ssmp/accoutcfg/set.cgi?x=InternetGatewayDevice.X_HW_DEBUG.SMP.DM.ResetBoard&RequestFile=html/ssmp/accoutcfg/ontmngt.asp'),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept-Encoding': 'gzip, deflate, br',
    }
  }
};

function getToken() {
  const { url, headers } = endpoints.token;
  return httpClient.post(url, { headers }).then(res => {
    const { statusCode, data } = res;
    if (200 !== statusCode)
      exit('request error, http('+statusCode+')');
    return data.trim();
  });
}

function login(username, password, token) {
  const { url, headers } = endpoints.login;
  const body = format('UserName=%s&PassWord=%s&Language=english&x.X_HW_Token=%s', username, password, token);
  return httpClient.post(url, { headers, body }).then(res => {
    const { statusCode, data, headers } = res;
    const cookieArray = headers['set-cookie'];
    if (!cookieArray || !cookieArray.length)
      throw new Error('login: did not receive sid cookie');
    const match = /(CookieHttp\=sid\=[a-zA-Z0-9]+)/.exec(cookieArray[0]);
    const cookie = match[0];
    return cookie+':Language:english:id=1';
  });
}

function getToken2(cookie) {
  const { url, headers } = endpoints.token2;
  headers['Cookie'] = cookie;
  return httpClient.get(url, { headers }).then(res => {
    const { statusCode, data } = res;
    if (200 !== statusCode)
      throw new Error('getToken2: request error, http('+statusCode+')');
    const match = /id\="hwonttoken" value\="([a-zA-Z0-9]+)"/.exec(data);
    const token = match[1];
    return token;
  });
}

fetchIpAddress().then(currIp => {
  log('restarting..., current IP:', currIp);
  getToken().then(token => {
    log('token ok');
    login(username, password, token).then(cookie => {
      log('login ok');
      getToken2(cookie).then(token2 => {
        log('token2 ok');
        const { url, headers } = endpoints.restart;
        headers['Cookie'] = cookie;
        const body = 'x.X_HW_Token='+token2;
        httpClient.post(url, { headers, body });
        log('reboot command sent, awaiting for internet...');
        new Promise(resolve => setTimeout(resolve, 11e3)).then(awaitInternet).then(fetchIpAddress).then(ip => {
          log('reboot complete, %s', currIp === ip ? 'ip not changed!' : 'new IP: '+ip);
        });
      });
    });
  });
});