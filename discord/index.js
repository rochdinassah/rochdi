'use strict';

const log = console.log.bind(console);

const Http2Client = require('../lib/http2-client');
const helpers = require('../lib/helpers');
const EventEmitter = require('node:events');
const WebScoket = require('ws');
const Command = require('../lib/command');
const tokensMap = require('./tokens');
const tokens = Object.keys(tokensMap);

const { formatDuration, rand, arrayRand } = helpers;
const { getNonce, randomString } = helpers;

const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';
const http2Client = new Http2Client({ userAgent });
const ee = new EventEmitter();
const command = new Command();

(async () => {
  const xsp = 'eyJvcyI6IkxpbnV4IiwiYnJvd3NlciI6IkNocm9tZSIsImRldmljZSI6IiIsInN5c3RlbV9\
sb2NhbGUiOiJmciIsImhhc19jbGllbnRfbW9kcyI6ZmFsc2UsImJyb3dzZXJfdXNlcl9hZ2VudCI6Ik1veml\
sbGEvNS4wIChYMTE7IExpbnV4IHg4Nl82NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWN\
rbykgQ2hyb21lLzEzNC4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTM0LjAuMC4\
wIiwib3NfdmVyc2lvbiI6IiIsInJlZmVycmVyIjoiIiwicmVmZXJyaW5nX2RvbWFpbiI6IiIsInJlZmVycmV\
yX2N1cnJlbnQiOiIiLCJyZWZlcnJpbmdfZG9tYWluX2N1cnJlbnQiOiIiLCJyZWxlYXNlX2NoYW5uZWwiOiJ\
zdGFibGUiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjo0MjYyMTMsImNsaWVudF9ldmVudF9zb3VyY2UiOm51bGw\
sImNsaWVudF9sYXVuY2hfaWQiOiJjMmFkZjcwYy1mZDZiLTRmOGQtOTJmNS1mMTMxYjAyYTVmYTUiLCJsYXV\
uY2hfc2lnbmF0dXJlIjoiODIyNmUyMDgtNzA0ZS00MzBjLTk5NzYtMDYxZTcyMDkwMzNjIiwiY2xpZW50X2h\
lYXJ0YmVhdF9zZXNzaW9uX2lkIjoiMGZlMWViYmUtZDE0Ni00MzMwLTljODUtODI2NzM2ZDU5YjdiIiwiY2x\
pZW50X2FwcF9zdGF0ZSI6ImZvY3VzZWQifQ==';

  const guild = {
    nameId: 'rochdi',
    id: '1364201039892316271'
  };

  const usersMap = new Map(), clients = [];

  log('tokens length:', tokens.length);

  const headers = {
    'Sec-Ch-Ua-Platform': '"Linux"',
    'Authorization': '',
    'X-Debug-Options': 'bugReporterEnabled',
    'Sec-Ch-Ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
    'Sec-Ch-Ua-Mobile': '?0',
    'X-Discord-Timezone': 'Africa/Casablanca',
    'X-Super-Properties': xsp,
    'X-Discord-Locale': 'fr',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Origin': 'https://discord.com',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'fr',
    'Priority': 'u=1, i'
  };

  function attach(token, opts = {}) {
    return new Promise(r => {
      const client = new WebScoket('wss://gateway.discord.gg/?encoding=json&v=9');

      client.token = token;

      const closed = () => (
        client.emit('close'),
        clearInterval(client.hbIntervalId),
        clients.splice(clients.indexOf(client)),
        log('connection close')
      );

      client.once('error', () => (log('connection error'), closed()));
      client.once('close', () => closed());
      client.once('open', () => log('connection open'));
      client.on('message', m => (m = JSON.parse(m.toString()), client.emit('op::'+m.op, m)));

      client.write = data => 1 === client.readyState && client.send(JSON.stringify(data));
      client.detach = reason => new Promise(r => (reason && log(reason), client.once('close', r), client.close(1001)));

      client.quitVoice = () => {
        const [guild_id, channel_id] = [null, null];
        client.write({
          op: 4, d: { guild_id, channel_id, self_mute: true, self_deaf: false, self_video: false, flags: 2 }
        });
      };

      client.joinVoice = (guild_id, channel_id) => {
        client.write({
          op: 4, d: { guild_id, channel_id, self_mute: arrayRand([false, true]), self_deaf: false, self_video: false, flags: 2 }
        });
      };

      client.on('op::10', data => {
        clearInterval(client.hbIntervalId);
        client.hbIntervalId = setInterval(() => client.write({ op: 1, d: 75 }), data.d.heartbeat_interval);
      });

      client.once('op::10', () => {
        client.write({
          op: 2,
          d: {
            token,
            capabilities: 161789,
            properties: {
              os: 'Linux',
              browser: 'Chrome',
              device: '',
              system_locale: 'fr',
              has_client_mods: false,
              browser_user_agent: http2Client.userAgent,
              browser_version: '134.0.0.0',
              os_version: '',
              referrer: '',
              referring_domain: '',
              referrer_current: '',
              referring_domain_current: '',
              release_channel: 'stable',
              client_build_number: 401882,
              client_event_source: null,
              client_launch_id: 'b4233f9b-580a-490f-9221-03eda93b72e0',
              client_app_state: 'unfocused',
              is_fast_connect: false,
              latest_headless_tasks: [],
              latest_headless_task_run_seconds_before: null,
              gateway_connect_reasons: 'AppSkeleton'
            },
            presence: { status: 'unknown', since: 0, activities: [], afk: false },
            compress: false,
            client_state: { guild_versions: {} }
          }
        });
        if (opts.status)
          client.write({ op: 3, d: { status: opts.status, since: 0, activities: [], afk: false } });
      });

      client.on('op::0', async data => {
        const { t, d } = data;

        if ('READY_SUPPLEMENTAL' === t) return (ee.emit('clientReady', client), r(client));

        if ('READY' === t) {
          clients.push(client);

          const {
            username,
            pronouns,
            phone,
            mobile,
            mfa_enabled,
            id,
            global_name,
            flags,
            email,
            desktop,
            bio,
            avatar
          } = client.infos = d.user;

          client.guilds = d.guilds.map(guild => new Object({ id: guild.id, nameId: guild.properties.name }));

          const { users } = d;
          users.forEach(u => usersMap[u.id] = { username: u.username, global_name: u.global_name, display_name: u.display_name });

          log('ready: %s | %s', global_name ?? username, id);
        } else if ('PRESENCE_UPDATE' === t) {
          // log(d);
        } else if ('GUILD_MEMBERS_CHUNK' === t) {
          const { presences, members, guild_id, chunk_index, chunk_count } = d;

          log('recv guild members chunk(%d) | cIndex: %d, cCount: %d', members.length, chunk_index, chunk_count);

          const names = [];
          members.forEach(member => {
            const { user, roles, nick, mute, deaf, communication_disabled_until } = member;
            const { username, public_flags, id, global_name, display_name } = user;
            const name = display_name ?? global_name ?? username;

            // log(name, username);

            let entry = names.find(e => name === e[0]);
            if (!entry) {
              entry = [name, 0];
              names.push(entry);
            }
            entry[1]++;
          });

          log(names.sort((a, b) => b[1]-a[1]).splice(0, 2));
        }
      });
    });
  }

  function sendMessage(token, channelId, content, message_reference) {
    return new Promise((resolve, reject) => {
      headers['Authorization'] = token;
      headers['Content-Type'] = 'application/json';

      const body = {
        mobile_network_type: 'unknown',
        content,
        nonce: getNonce(),
        tts: false,
        message_reference,
        allowed_mentions: { parse: ['users', 'roles', 'everyone'], replied_user: false },
        flags: 0
      };
      
      if (!body.message_reference)
        delete body.message_reference;

      http2Client.post('https://discord.com/api/v9/channels/'+channelId+'/messages', { headers, body }).then(res => {
        const { statusCode, data } = res;
        if (200 !== statusCode)
          return reject(data);
        resolve(data);
      });
    });
  }

  function deleteMessage(token, channelId, messageId) {
    return new Promise(resolve => {
      headers['Authorization'] = token;
      http2Client.delete('https://discord.com/api/v9/channels/'+channelId+'/messages/'+messageId, { headers }).then(res => {
        const { statusCode, data } = res;

        if (204 === statusCode)
          return (log('delete ok'), resolve(data));
        if (429 === statusCode)
          return (
            log('delete ratelimit error | retrying...'),
            setTimeout(() => resolve(deleteMessage(token, channelId, messageId)), rand(1e3, 4e3))
          );

        log('api delete message error http(%d)', statusCode);
        resolve();
      });
    });
  }

  function react(token, channelId, messageId, reaction = '%E2%9C%85') {
    headers['Authorization'] = token;
    return new Promise(resolve => {
      http2Client.put('https://discord.com/api/v9/channels/'+channelId+'/messages/'+messageId+'/reactions/'+reaction+'/%40me', { headers }).then(res => {
        const { statusCode, data } = res;
        if (204 !== statusCode)
          return resolve(!! void log('reaction add error | http('+statusCode+')'));
        resolve(!void log('reaction add ok'))
      });
    });
  }

  function interact(opts = {}) {
    return new Promise(resolve => {
      const { token, type, guild_id, channel_id, message_flags, message_id, application_id, data } = opts;
      const payload = {
        type: type ?? 3,
        nonce: getNonce(),
        guild_id,
        channel_id,
        message_flags: message_flags ?? 0,
        message_id,
        application_id,
        session_id: randomString(32).toLowerCase(),
        data
      };

      headers['Authorization'] = token;
      headers['Content-Type'] = 'application/json';

      http2Client.post('https://discord.com/api/v9/interactions', { headers, body: JSON.stringify(payload) }).then(res => {
        const { statusCode, data } = res;
        if (204 === statusCode)
          log('interaction ok');
        else
          log('interaction error');
        resolve();
      });
    });
  }

  function createInvite(token, channel_id) {
    return new Promise(r => {
      headers['Authorization'] = token;
      http2Client.post('https://discord.com/api/v9/channels/'+channel_id+'/invites', { headers }).then(r);
    });
  }

  function getUserInfo(guildId, userId) {
    return new Promise(async r => {
      const token = subToken;

      const url = 'https://discord.com/api/v9/guilds/'+guildId+'/messages/search/tabs';
      const body = {
        tabs: { messages: { author_id: [userId], limit: 1, cursor: null } },
        track_exact_total_hits: true,
        include_nsfw: true
      };

      headers['Authorization'] = token;
      headers['Content-Type'] = 'application/json';

      const { statusCode, data } = await http2Client.post(url, { headers, body: JSON.stringify(body) });

      delete headers['Content-Type'];

      if (200 !== statusCode) throw new Error('getUserInfo error, req#1 | http('+statusCode+')');

      const totalMessages = data.tabs.messages.total_results;

      headers['Authorization'] = token;
      http2Client.get('https://discord.com/api/v9/users/'+userId+'/profile?guild_id='+guildId, { headers }).then(res => {
        const { statusCode, data } = res;
        if (200 !== statusCode) throw new Error('getInfo error, req#2 | http('+statusCode+')');
        const { communication_disabled_until, nick, mute, deaf } = data.guild_member;
        const name = nick ?? data.user.global_name ?? data.user.username;
        let timeout = null === communication_disabled_until ? 'none' : void 0;

        if (void 0 === timeout) {
          const d = new Date();
          const td = new Date(communication_disabled_until);
          if (d <= td)
            timeout = formatDuration(td-d)
          else
            timeout = '-'+formatDuration(d-td);
        }

        log('%s: messages(%d), timeout(%s), mute(%s), deaf(%s)', name, totalMessages, timeout, mute, deaf);
        r();
      });
    });
  }

  let i = 0, total_results = 1;
  function clearMessages(author_token, author_id) {
    return new Promise(resolve => {
      headers['Authorization'] = mainToken;
      headers['Content-Type'] = 'application/json';

      log('retreiving message list...');
      const offset = Math.max(1, (total_results-25));
      const url = 'https://discord.com/api/v9/guilds/'+guild.id+'/messages/search?author_id='+author_id+'&offset='+offset;
      http2Client.get(url, { headers }).then(async res => {
        const { statusCode, data } = res;
        if (200 !== statusCode)
          throw new Error('api error for /messages/search, http('+statusCode+')');
        const messages = data.messages.map(m => m[0]);
        log('message list ok (%d) | clearing...', messages.length);
        
        total_results = data.total_results;
        log('current total:', total_results);

        if (!messages.length) {
          log('no messages were found, retrying...');
          return setTimeout(resolve, rand(4e3, 7e3));
        }

        for (let i = 0, message; messages.length > i; ++i) {
          message = messages[i];
          await deleteMessage(author_token, message.channel_id, message.id);
          await new Promise(resolve => setTimeout(resolve, rand(2**10, 2**11)));
        }
        log('purge iteration#%d done', ++i);
        resolve();
      });
    });
  }

  function clearDM(token, author_id, channel_ids) {
    return new Promise(resolve => {
      headers['Authorization'] = token;
      headers['Content-Type'] = 'application/json';

      channel_ids.shuffle();
      const body = JSON.stringify({
        channel_ids,
        tabs: {
          messages: {
            sort_by: 'timestamp',
            sort_order: 'desc',
            author_id: [author_id],
            offset: 0,
            limit: 25
          }
        },
        track_exact_total_hits: true
      });

      log('retreiving DM message list...');
      http2Client.post('https://discord.com/api/v9/users/@me/messages/search/tabs', { headers, body }).then(async res => {
        const { statusCode, data } = res;
        if (200 !== statusCode)
          throw new Error('api error for /users/@me/messages/search/tabs, http('+statusCode+')');
        const messages = data.tabs.messages.messages.map(m => m[0]).filter(m => channel_ids.includes(m.channel_id));

        log('message list ok (%d) | clearing...', messages.length);

        if (!messages.length)
          return resolve(void log('no DM messages were found for the given channel_ids!'));

        for (let i = 0, message; messages.length > i; ++i) {
          message = messages[i];
          await deleteMessage(token, message.channel_id, message.id);
          await new Promise(resolve => setTimeout(resolve, rand(1024, 2048)));
        }

        await new Promise(resolve => setTimeout(resolve, rand(8e3, 17e3)));
        clearDM(token, author_id, channel_ids);
      });
    });
  }

  // required cipher: RSA-PSK-AES256-CBC-SHA
  function updateProfile(token, data = {}) {
    return new Promise(async resolve => {
      headers['Authorization'] = token;
      headers['Content-Type'] = 'application/json';

      const body = JSON.stringify(data);
      const url = 'https://discord.com/api/v9/users/@me';
      const session = http2Client.createSession(url, 'RSA-PSK-AES256-CBC-SHA');
      http2Client.patch(url, { session, headers, body }).then(res => {
        const { statusCode, data } = res;
        if (200 !== statusCode) {
          const { message, errors } = data;
          log(data);
          return resolve(void log('api error /users/@me, %s, http(%d)', message, statusCode))
        }
        const { id, username, avatar, global_name, email } = data;
        resolve(!void log('Profile update ok', id, username, avatar, global_name, email));
      });
    });
  }

  const bulkAttach = () => {
    const p = [];
    tokens.forEach(token => { if (!clients.find(c => token === c.token)) p.push(attach(token)); });
    return Promise.all(p).then(() => log('bulk attach ok'));
  };
  const detach = () => (log('detaching...'), clients.forEach(client => client.close(1001)));

  const token = tokens[0];
  const content = 'foo';
  const channelIds = [];

  const cb = async (token, channel_id) => {
    const p = [], limit = 4;
    if (Array.isArray(channel_id)) {
      structuredClone(channel_id.shuffle()).splice(0, limit).forEach(id => {
        p.push(
          new Promise(
            resolve => sendMessage(token, id, content).then(
              data => (
                resolve(),
                data && deleteMessage(token, data.channel_id, data.id)
              )
            )
          )
        );
      });
    } else {
      for (let i = 0; limit > i; ++i) {
        p.push(new Promise(
          resolve => sendMessage(token, channel_id, content)
            .then(data => (resolve(), data && deleteMessage(token, data.channel_id, data.id))
        )));
      }
    }
    return Promise.all(p);
  };

  function deleteAccount(token, password) {
    headers['Authorization'] = token;
    headers['Content-Type'] = 'application/json';
    return http2Client.post('https://discord.com/api/v9/users/@me/delete', { headers, body: { password } }).then(({ statusCode, data }) => {
      if (204 !== statusCode) return log('account deletion error, message: %s, http(%d)', data.message, statusCode), false;
      return log('account deletion ok'), true;
    });
  }

  // bulkAttach();

  command.on('clear', () => clearMessages(token, tokensMap[token]));

  command.on('attach', arg => (log('attaching...'), arg ? attach(tokens[arg]) : bulkAttach()));
  command.on('detach', detach);

  command.on('userinfo', userId => getUserInfo(guild.id, userId));
  command.on('infos', key => client && log(key ? client.infos[key] : client.infos));
  command.on('eval', expression => eval(expression));

  command.on('join', channelId => clients.forEach(client => client.joinVoice(guild.id, channelId)));
  command.on('quit', () => clients.forEach(client => client.quitVoice()));

  command.on('status', (user_id) => {
    client.write({ op: 37, d: { subscriptions: { [guild.id]: { members: [] }}}});
    client.write({ op: 37, d: { subscriptions: { [guild.id]: { members: [user_id] }}}});
  });

  log('noop');
})();