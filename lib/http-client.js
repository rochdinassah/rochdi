'use strict';

const log = console.log.bind(console);

const http = require('node:http');
const https = require('node:https');
const urlParser = require('node:url').parse;
const helpers = require('./helpers');
const EventEmitter = require('node:events');
const tls = require('node:tls');
const zlib = require('node:zlib');

const { formatDuration, rand } = helpers;

const DEFAULT_CIPHERS = tls.DEFAULT_CIPHERS;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36';
const USER_AGENT_REGEXP = new RegExp(/^user\-agent$/i);

const AGENTS = {
  https: new https.Agent({ keepAlive: true, maxSockets: Infinity }),
  http: new http.Agent({ keepAlive: true, maxSockets: Infinity }),
};

module.exports = HttpClient;

HttpClient.DEFAULT_CIPHERS = DEFAULT_CIPHERS;
HttpClient.DEFAULT_USER_AGENT = DEFAULT_USER_AGENT;
HttpClient.USER_AGENT_REGEXP = USER_AGENT_REGEXP;

function HttpClient(opts = {}) {
  const { retryOnError, userAgent } = opts;

  this.retryOnError = retryOnError ?? true;
  this.userAgent = userAgent;
}

HttpClient.prototype = new EventEmitter();

['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE', 'HEAD'].forEach(method => {
  HttpClient.prototype[method.toLowerCase()] = function () {
    return this._request(method, ...arguments);
  };
});

HttpClient.prototype.set = function (propertyName, value) {
  this[propertyName] = value;
};

HttpClient.prototype.setCipher = function (cipher) {
  if (cipher) {
    tls.DEFAULT_CIPHERS = cipher;
  }
};

HttpClient.prototype.resetCipher = function () {
  tls.DEFAULT_CIPHERS = DEFAULT_CIPHERS;
};

HttpClient.prototype.parseUserAgent = function (headers) {
  const { userAgent } = this;
  const headerKeys = Object.keys(headers);
  for (let i = 0, key, match; headerKeys.length > i; ++i) {
    key = headerKeys[i];
    if (match = USER_AGENT_REGEXP.exec(key)) {
      if (!headers[key].length)
          headers[key] = userAgent ?? DEFAULT_USER_AGENT;
      break;
    }
  }
};

HttpClient.prototype._request = function (method, urlString, opts = {}) {
  let { headers, body, cipher } = opts;

  headers = { ...headers };
  this.parseUserAgent(headers);

  const { protocol, hostname, path } = urlParser(urlString);
  const agent = AGENTS[protocol.replace(':', '')];

  let rr;
  const promise = new Promise((resolve, reject) => rr = { resolve, reject });

  if (body) {
    if ('object' === typeof body)
      body = JSON.stringify(body);
    headers['content-length'] = Buffer.byteLength(body);
  }

  this.setCipher(cipher);
  const stream = ('https:' === protocol ? https : http)
    .request({ hostname, path, method, headers, agent })
    .on('error', this.onerror.bind(this, arguments, rr))
    .on('response', res => (res.headers[':status'] = res.statusCode, this.onresponse(res.headers, res, rr)));
  this.resetCipher();

  if (body)
    stream.write(body);

  return stream.end(), promise;
};

HttpClient.prototype.onerror = function (args, promise, err) {
  const { retryOnError } = this;
  const opts = args[2];

  if (!((opts && opts.retryOnError) ?? retryOnError)) {
    return promise.reject(err.code);
  }

  const jitter = rand(1e3, 4e3);
  setTimeout(() => promise.resolve(this._request(...args)), jitter);
  log('request error, retrying in %s...', formatDuration(jitter));
};

HttpClient.prototype.onresponse = function (headers, stream, promise) {
  const responseBuffer = [];
  const statusCode = headers[':status'];
  const responseEncoding = headers['content-encoding'];

  switch (responseEncoding) {
    case 'gzip': stream = stream.pipe(zlib.createGunzip()); break;
    case 'deflate': stream = stream.pipe(zlib.createInflate()); break;
    case 'br': stream = stream.pipe(zlib.createBrotliDecompress()); break;
  }

  stream.on('data', responseBuffer.push.bind(responseBuffer))
  stream.on('end', () => {
    let data = String(Buffer.concat(responseBuffer));
    try {
      data = JSON.parse(data);
    } catch {}
    promise.resolve({ headers, data, statusCode });
  });
};