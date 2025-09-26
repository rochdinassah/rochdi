// author: rochdi nassah
// created: 2025/09/18

'use strict';

const rochdi = require('../../');

const { HttpClient, Logger } = rochdi;

const httpClient = new HttpClient();

const user = process.env.WIFI_ROUTER_USER || exit('rw: WIFI_ROUTER_USER env is missing');
const pass = process.env.WIFI_ROUTER_PASS || exit('rw: WIFI_ROUTER_PASS env is missing');

const logger = new Logger({ prefix: 'restart-wifi', errcb: (err) => {
  process.exit(1);
}})

function getToken() {
  const url = 'http://192.168.1.1/asp/GetRandCount.asp';
  return httpClient.post(url, { headers: { 'content-length': 0 } }).then(res => {
    const { statusCode, data } = res;
    if (200 !== statusCode)
      throw new Error('getToken: request error, http('+statusCode+')');
    logger.debug('token ok');
    return data.replace(/\s/, '');
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
        throw new Error('login: request error, http('+statusCode+')');
      const cookie = headers['set-cookie'];
      if (!cookie || !cookie.length)
        throw new Error('login: did not receive set-cookie header');
      const match = /(CookieHttp\=sid\=[a-z0-9]+\:Language\:english\:id\=1);path\=\/;HttpOnly/.exec(cookie[0]);
      if (!match[1])
        throw new Error('login: did not receive CookieHttp');
      logger.debug('login ok');
      return match[1];
    });
  });
}

function getToken2(cookie) {
  return httpClient.get('http://192.168.1.1/html/ssmp/accoutcfg/ontmngt.asp', { headers: { cookie } }).then(res => {
    const { statusCode, data } = res;
    if (200 !== statusCode)
      throw new Error('getToken2: request error, http('+statusCode+')');
    const match = /[a-z0-9]{64}/.exec(data);
    if (!match[0])
      throw new Error('getToken2: token extraction error');
    logger.debug('token2 ok');
    return match[0];
  })
}

httpClient.get('http://ifconfig.me', { headers: { 'user-agent': 'curl' } }).then(res => {
  const currIP = res.data;

  logger.info('rebooting... curr IP:', currIP);

  login(user, pass).then(cookie => {
  getToken2(cookie).then(token => {
    const url = 'http://192.168.1.1/html/ssmp/accoutcfg/set.cgi?x=InternetGatewayDevice.\
X_HW_DEBUG.SMP.DM.ResetBoard&RequestFile=html/ssmp/accoutcfg/ontmngt.asp';
    const headers = {
      cookie,
      'content-type': 'application/x-www-form-urlencoded'
    };
    httpClient.post(url, { headers, body: 'x.X_HW_Token='+token, retryOnError: false }).catch(noop);

    logger.info('reboot command sent, awaiting for internet...');

    setTimeout(() => {
      awaitInternet().then(() => {
        httpClient.get('http://ifconfig.me', { headers: { 'user-agent': 'curl' } }).then(res => {
          log('reboot %s, currIP:', res.data);
          if (currIP !== res.data)
            return logger.info('reboot ok, new IP:', res.data);
          logger.info('reboot complete, IP not changed!');
        });
      });
    }, 8e3);
  });
});
});