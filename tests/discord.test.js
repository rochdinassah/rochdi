// author: rochdi nassah

'use strict';

require('./_matchers');

const rochdi = require('rochdi');

const { Discord } = rochdi;

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_USER_TOKEN = process.env.DISCORD_USER_TOKEN;

test('bot auth', async () => {
  if (!DISCORD_BOT_TOKEN)
    return;

  const discord = new Discord(DISCORD_BOT_TOKEN);

  expect(await discord.connect()).toBe(true);
  expect(await discord.disconnect()).toBe(1001);
});

test('user auth', async () => {
  if (!DISCORD_USER_TOKEN)
    return;

  const discord = new Discord(DISCORD_USER_TOKEN);
  
  expect(await discord.connect()).toBe(true);
  expect(await discord.disconnect()).toBe(1001);
});