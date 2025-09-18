// author: rochdi nassah
// created: 2025/09/18

'use strict';

const rochdi = require('../../');

const { HttpClient } = rochdi;

const httpClient = new HttpClient();

const user = process.env.WIFI_ROUTER_USER;
const pass = process.env.WIFI_ROUTER_PASS;

exit(user, pass);

const endpoints = {

};

log(16)