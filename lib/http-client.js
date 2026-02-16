// author: rochdi nassah

'use strict';

const http = require('node:http');
const https = require('node:https');
const zlib = require('node:zlib');
const tls = require('node:tls');
const Logger = require('./logger');
const EventEmitter = require('node:events');

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const DEFAULT_CIPHERS = tls.DEFAULT_CIPHERS; 

class HttpClient extends EventEmitter {
  constructor(opts = {}) {
    super();

    const { logger, retry_on_error, timeout, user_agent } = opts;

    this.logger = logger ?? new Logger.SilentLogger();
    this.retry_on_error = retry_on_error ?? true;
    this.timeout = timeout;
    this.user_agent = user_agent ?? DEFAULT_USER_AGENT;
  }

  updateCipher(cipher) {
    if (cipher)
      tls.DEFAULT_CIPHERS = cipher;
  }

  resetCipher() {
    tls.DEFAULT_CIPHERS = DEFAULT_CIPHERS;
  }

  _parseUserAgent(headers) {
    const regexp = /^user\-agent$/i;
    const keys = Object.keys(headers);
    for (let i = 0, key, match; keys.length > i; ++i){
      key = keys[i];
      if (match = regexp.exec(key))
        if (!headers[key].length)
          headers[key] = this.user_agent;
    }
  }

  _request(method, url_string, opts = {}) {
    return new Promise((resolve, reject) => {
      const { protocol, hostname, pathname, search, port } = new URL(url_string);
      const { cipher } = opts;

      const path = pathname+search;

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
        .request({ method, hostname, port, path, headers })
        .on('error', this.onError.bind(this, { resolve, reject }, arguments))
        .on('response', this.onResponse.bind(this, { resolve, reject }));
      this.resetCipher();

      if (body)
        req.write(body);
      
      req.end();
    });
  }

  onError(promise, args, error) {
    const retry_on_error = args[2].retry_on_error ?? this.retry_on_error;
    if (!retry_on_error)
      return promise.reject('request error: '+error.code);
    const jitter = 'number' === typeof retry_on_error ? retry_on_error : rand(1e3, 4e3);
    setTimeout(() => promise.resolve(this._request(...args)), jitter);
    this.logger.warn('request error, retrying in %s', formatDuration(jitter));
  }

  onResponse(promise, response) {
    const { statusCode, headers } = response;
  
    const response_buff = [];
    const response_encoding = headers['content-encoding'];
    
    switch (response_encoding) {
      case 'gzip': response = response.pipe(zlib.createGunzip()); break;
      case 'br': response = response.pipe(zlib.createBrotliDecompress()); break;
      case 'deflate': response = response.pipe(zlib.createDeflate()); break;
      case 'zstd': response = response.pipe(zlib.createZstdDecompress()); break;
    }

    response.on('data', response_buff.push.bind(response_buff));
    response.on('end', () => {
      let data = String(Buffer.concat(response_buff));
      try {
        data = JSON.parse(data);
      } catch {}
      promise.resolve({ status_code: statusCode, headers, data });
    });
  }
}

for (const method of ['GET', 'POST', 'OPTIONS', 'CONNECT', 'DELETE', 'HEAD', 'PATCH', 'PUT']) {
  HttpClient.prototype[method.toLowerCase()] = function (urlString, opts = {}) {
    return this._request(method, urlString, opts);
  };
}

module.exports = HttpClient;
module.exports.USER_AGENT = DEFAULT_USER_AGENT;