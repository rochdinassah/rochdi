// author: rochdi nassah
// created: 2025/09/18

'use strict';

const http = require('node:http');
const https = require('node:https');
const parseUrl = require('node:url').parse;
const zlib = require('node:zlib');
const tls = require('node:tls');
const Logger = require('./logger');

module.exports = HttpClient;

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const DEFAULT_CIPHERS = tls.DEFAULT_CIPHERS;

function HttpClient(opts = {}) {
  this.logger = opts.logger ?? new Logger({ prefix: 'http-client' });
  this.retryOnError = opts.retryOnError ?? true;
  this.userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
}

for (const method of ['GET', 'POST', 'OPTIONS', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT']) {
  HttpClient.prototype[method.toLowerCase()] = function (urlString, opts = {}) {
    return this._request(method, urlString, opts);
  };
}

HttpClient.prototype.updateCipher = function(cipher) {
  if (cipher)
    tls.DEFAULT_CIPHERS = cipher;
};

HttpClient.prototype.resetCipher = function () {
  tls.DEFAULT_CIPHERS = DEFAULT_CIPHERS;
};

// try tls fingerprinting bypass
HttpClient.prototype.findCipher = function (url, opts = {}) {
  return new Promise(async resolve => {
    const headers = { ...opts.headers };
    const method = opts.method ?? 'GET';
    const statusCodes = opts.statusCodes ?? [403];
    const results = [];
    const ciphers = [void 0, ...tls.getCiphers().map(cipher => cipher.toUpperCase())];
    for (const cipher of ciphers) {
      try {
        const { statusCode } = await this._request(method, url, { cipher, headers, retryOnError: false });
        if (statusCodes.includes(statusCode))
          continue;
        results.push({ cipher, statusCode });
        break;
      } catch {}
    }
    results.ciphers = Object.values(results).map(v => v.cipher);
    resolve(results);
  });
};

HttpClient.prototype._parseUserAgent = function (headers) {
  const regexp = /^user\-agent$/i;
  const keys = Object.keys(headers);
  for (let i = 0, key, match; keys.length > i; ++i){
    key = keys[i];
    if (match = regexp.exec(key)) {
      if (!headers[key].length) {
        headers[key] = this.userAgent;
      }
    }
  }
};

HttpClient.prototype._request = function (method, urlString, opts = {}) {
  return new Promise((resolve, reject) => {
    const { protocol, hostname, path } = parseUrl(urlString);
    const { cipher } = opts;

    let headers = { ...opts.headers };
    this._parseUserAgent(headers);

    let body = opts.body;
    if (body) {
      if ('object' === typeof body)
        body = JSON.stringify(body);
      headers['content-length'] = Buffer.byteLength(body);
    }

    this.updateCipher(cipher);
    const req = ('https:' === protocol ? https : http)
      .request({ method, hostname, path, headers })
      .on('error', this.onerror.bind(this, { resolve, reject }, arguments))
      .on('response', this.onresponse.bind(this, { resolve, reject }));
    this.resetCipher();

    if (body)
      req.write(body);
    
    req.end();
  });
};

HttpClient.prototype.onerror = function (promise, args, err) {
  const retryOnError = args[2].retryOnError ?? this.retryOnError;
  if (!retryOnError)
    return promise.reject('request error: '+err.code);
  const jitter = rand(1e3, 4e3);
  setTimeout(() => promise.resolve(this._request(...args)), jitter);
  this.logger.warn('request error, retrying in %s', formatDuration(jitter));
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