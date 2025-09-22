// author: rochdi nassah
// created: 2025/09/18

'use strict';

const rochdi = require('../../');

const { HttpClient } = rochdi;

const httpClient = new HttpClient();

const user = process.env.WIFI_ROUTER_USER || exit('rw: WIFI_ROUTER_USER env is missing');
const pass = process.env.WIFI_ROUTER_PASS || exit('rw: WIFI_ROUTER_PASS env is missing');

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
    return log('token2 ok'), match[0];
  })
}

httpClient.get('http://ifconfig.me', { headers: { 'user-agent': 'curl' } }).then(res => {
  const currIP = res.data;
  log('rebooting... curr IP:', currIP);

  login(user, pass).then(cookie => {
  getToken2(cookie).then(token => {
    const url = 'http://192.168.1.1/html/ssmp/accoutcfg/set.cgi?x=InternetGatewayDevice.\
X_HW_DEBUG.SMP.DM.ResetBoard&RequestFile=html/ssmp/accoutcfg/ontmngt.asp';
    const headers = {
      cookie,
      'content-type': 'application/x-www-form-urlencoded'
    };
    httpClient.post(url, { headers, body: 'x.X_HW_Token='+token, retryOnError: false }).catch(noop);
    log('reboot command sent, awaiting for internet...');
    setTimeout(() => {
      awaitInternet().then(() => {
        httpClient.get('http://ifconfig.me', { headers: { 'user-agent': 'curl' } }).then(res => {
          log('reboot %s, currIP:', res.data);
          if (currIP !== res.data)
            return log('reboot ok, new IP:', res.data);
          log('reboot complete, IP not changed!');
        });
      });
    }, 8e3);4e3
  });
});
});