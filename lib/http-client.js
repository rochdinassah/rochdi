// author: rochdi nassah
// created: 2025/09/18

'use strict';

const log = console.log;

const http = require('node:http');
const https = require('node:https');
const parseUrl = require('node:url').parse;
const helpers = require('./helpers');
const zlib = require('node:zlib');

const { rand } = helpers;

module.exports = HttpClient;

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

function HttpClient(opts = {}) {
  this.retryOnError = opts.retryOnError ?? true;
  this.userAgent = opts.userAgent;
}

for (const method of ['GET', 'POST', 'OPTIONS', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT']) {
  HttpClient.prototype[method.toLowerCase()] = function (urlString, opts = {}) {
    return this._request(method, urlString, opts);
  };
}

HttpClient.prototype._parseUserAgent = function (headers) {
  const regexp = /^user\-agent$/i;
  const keys = Object.keys(headers);
  for (let i = 0, key, match; keys.length > i; ++i){
    key = keys[i];
    if (match = regexp.exec(key)) {
      if (!headers[key].length) {
        headers[key] = this.userAgent ?? DEFAULT_USER_AGENT;
      }
    }
  }
  exit(headers);
};

HttpClient.prototype._request = function (method, urlString, opts = {}) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, path } = parseUrl(urlString);

    let headers = { ...opts.headers };

    this._parseUserAgent(headers);

    const req = ('https:' === protocol ? https : http)
      .request({ method, hostname, path, headers })
      .on('error', this.onerror.bind(this, { resolve, reject }, arguments))
      .on('response', this.onresponse.bind(this, { resolve, reject }));

    req.end();
  });
};

HttpClient.prototype.onerror = function (promise, args) {
  if (this.retryOnError) {
    const jitter = rand(1e3, 4e3);
    setTimeout(() => promise.resolve(this._request(...args)), jitter);
    log('request error, retrying in %d milliseconds', jitter);
  } else {
    promise.reject('request error');
  }
};

HttpClient.prototype.onresponse = function (promise, res) {
  const { statusCode, headers } = res;

  const responseBuff = [];
  const responseEncoding = headers['content-encoding'];

  switch (responseEncoding) {
    case 'gzip': res = res.pipe(zlib.createGunzip()); break;
    case 'br': res = res.pipe(zlib.createBrotliDecompress()); break;
    case 'deflate': res = res.pipe(zlib.createDeflate()); break;
    case 'zstd': res = res.pipe(zlib.createZstdDecompress()); break;
  }

  res.on('data', responseBuff.push.bind(responseBuff));
  res.on('end', () => {
    let data = String(Buffer.concat(responseBuff));
    try {
      data = JSON.parse(data);
    } catch {}
    promise.resolve({ statusCode, headers, data });
  });
};