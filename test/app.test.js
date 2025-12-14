// author: rochdi nassah

'use strict';

const rochdi = require('rochdi');

require('./_matcher');

const { Server, Client } = rochdi;

const port = rand(2**14, 2**16-1);
const address = 'ws://127.1:'+port;

const server = new Server({ port, ping_interval: 128 });

beforeEach(() => {
  return server.run();
});

test('connection reply test', async () => {
  const p = [];
  for (let i = 0; 32 > i; ++i) {
    p.push(new Promise(resolve => {
      const client = new Client(address);
      client.run().then(() => {
        const value = randomString(1024);
        client.sendMessage('EchoRequestMessage', { value }, reply => {
          expect(reply.echo_value).toBe(value);
          resolve(client.close());
        });
      });
    }));
  }
  await Promise.all(p);
  server.close();
});