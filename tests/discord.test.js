// author: rochdi nassah

'use strict';

require('./_matchers');

const rochdi = require('rochdi');

const { Discord } = rochdi;

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

const discord = new Discord(DISCORD_BOT_TOKEN);

test('basic connection flow test', async () => {
  expect(await discord.connect()).toBe(true);
  expect(await discord.disconnect()).toBe(1001);
});