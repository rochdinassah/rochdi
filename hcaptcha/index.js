'use strict';

const log = console.log.bind(console);

const Http2Client = require('../lib/http2-client');
const helpers = require('../lib/helpers');
const hsl = require('./hsl');
const openai = require('../openai');

const { formatDuration, rand, toQueryString } = helpers;

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';
const http2Client = new Http2Client({ retryOnError: true, userAgent: USER_AGENT });

function temp() {
  const headers = {
    Host: 'discord.com',
    'Sec-Ch-Ua-Platform': '"Linux"',
    'X-Debug-Options': 'bugReporterEnabled',
    'Sec-Ch-Ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    'Sec-Ch-Ua-Mobile': '?0',
    'X-Discord-Timezone': 'Africa/Casablanca',
    'X-Discord-Locale': 'fr',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    Accept: '*/*',
    Origin: 'https://discord.com',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'fr',
    Priority: 'u=1, i'
  };

  const url = 'https://discord.com/api/v9/auth/register';
  const body = {
    fingerprint: '1414046625101516851.q66NQoEJ-ts0guKFDMn6uD9tm0I',
    email: 'dolor@gmail.com',
    username: 'foo069529',
    global_name: 'foo',
    password: 'foobarbazqux',
    invite: null,
    consent: true,
    date_of_birth: '2002-06-04',
    gift_code_sku_id: null,
    promotional_email_opt_in: false
  };
  http2Client.post(url, { headers, body }).then(res => {
    const { statusCode, data } = res;
    if (400 === statusCode) {
      const { captcha_rqdata } = data;
      return solve_hcaptcha(captcha_rqdata);
    } else if (429 === statusCode) {
      const { retry_after, global } = data;
      return log('ratelimit | retry_after: %d, global: %s', retry_after, global);
    } else {
      log(statusCode);
    }
  });
}

temp();

const host = 'discord.com';
const v = 'da8adbd0b735ddb4e3e56849ed06964a8b5e6b90';
const sitekey = 'a9b5fb07-92ff-493f-86fe-352a2803b3df';
const endpoints = {
  checksiteconfig: {
    url: 'https://api.hcaptcha.com/checksiteconfig?v='+v+'&host=discord.com&sitekey='+sitekey,
    headers: {
      'User-Agent': ''
    }
  },
  getcaptcha: {
    url: 'https://api.hcaptcha.com/getcaptcha/'+sitekey,
    headers: {
      'Host': 'api.hcaptcha.com',
      'User-Agent': '',
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  },
  checkcaptcha: {
    url: 'https://api.hcaptcha.com/checkcaptcha/'+sitekey,
    headers: {
      'Host': 'api.hcaptcha.com',
      'User-Agent': '',
      'Content-Type': 'application/json;charset=UTF-8'
    }
  }
};

function solve_hcaptcha(rqdata) {
  const payload = { v, sitekey, host, a11y_tfe: true, rqdata, n: void 0, c: void 0 };

  function getC() {
    const { url, headers } = endpoints.checksiteconfig;
    return http2Client.get(url, { headers }).then(({ statusCode, data }) => {
      if (200 !== statusCode)
        throw new Error('getC: api error /checksiteconfig | http('+statusCode+')');
      payload.c = data.c;
    });
  }

  let retries = 0, maxRetries = Infinity;
  async function getTasks() {
    payload.n = 'hsl' !== payload.c.type ? 'fail' : await hsl(payload.c.req);

    const { url, headers } = endpoints.getcaptcha;
    
    return http2Client.post(url, { headers, body: toQueryString(payload) }).then(({ statusCode, data }) => {
      if (429 === statusCode)
        return log('getTask: api /getcaptcha ratelimit error, will retry shortly...'), setTimeout(getTasks, rand(2e3, 5e3));
      if (200 !== statusCode) {
        throw new Error('getTask: api /getcaptcha unknown error, http('+statusCode+')');
      }
      if (maxRetries === retries)
        throw new Error('solve_hcaptcha gave up at getTasks() | retries: '+retries);
      if (!data.key)
        return ++retries, payload.c = data.c, getTasks();
      return log('success | retries: %d', retries), data;
    });
  }
  async function check(data) {
    const { key, request_type, tasklist, c } = data;
    const { url, headers } = endpoints.checkcaptcha;

    const body = {
      v,
      job_mode: request_type,
      answers: {},
      serverdomain: host,
      sitekey,
      motionData: '{}',
      n: await hsl(c.req),
      c: JSON.stringify(c)
    };

    const dataset = require('../openai/dataset/hcaptcha');
    const questions = tasklist.map(({ datapoint_text }) => datapoint_text.en);
    const promptContent = [dataset, ...questions];

    return openai.sendMessage(promptContent, '689c4572-3bb4-8327-beb9-3b6246faf00b').then(reply => {
      const { content } = reply;
      content.split(',').forEach((text, i) => body.answers[tasklist[i].task_key] = { text });
      return http2Client.post(url+'/'+key, { headers, body }).then(({ statusCode, data }) => {
        if (200 !== statusCode)
          throw new Error('api error /checkcaptcha | http('+statusCode+')');

        const { pass, generated_pass_UUID, expiration, c } = data;

        if (pass) {
          const retryTimeout = rand(16e3, 32e3);
          log('success, will test again in %s...', formatDuration(retryTimeout));
          setTimeout(temp, retryTimeout);
        } else {
          log('\n');
          log(JSON.stringify(questions));
          log('\n');
          log(Object.values(body.answers).map(v => v.text));
          log('\n');
          log('did not pass!');
        }
      });
    });
  }

  getC().then(getTasks).then(check);
}