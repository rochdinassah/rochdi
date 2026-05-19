// author: rochdi nassah

'use strict';

const StateManager = require('./state');
const Logger = require('../logger');

class NetworkManager extends StateManager {
  constructor(opts = {}) {
    super();

    const { logger } = opts;

    this.logger = logger ?? new Logger({ prefix: 'network-manager' });
  }

  exec(command) {
    return new Promise(resolve => {
      exec(command, (err, stdout, stderr) => {
        resolve(err ? void 0 : stdout.trim());
      });
    });
  }

  getConnections(opts = {}) {
    const { active } = opts;

    const args = [];

    if (active)
      args.push('--active');

    return this.exec('nmcli -t -f UUID,TYPE,NAME c s '+args.join(' ')).then(out => {
      if (!out)
        return [];
      const list = stdout.trim().split(/\n/).map(v => {
        const [uuid, type,name] = v.split(':');
        return {
          uuid,
          type,
          name
        }
      });
      return list.filter(connection => 'loopback' !== connection.type);
    });
  }

  getActiveConnections() {
    return this.getConnections({ active: true });
  }

  getWifiConnection() {
    return this.getConnections().then(connections => {
      return connections.find(connection => 'Fibre_MarocTelecom-0966-5GHz' === connection.name);
    });
  }

  getEthernetConnection() {
    return this.getConnections().then(connections => {
      return connections.find(connection => '802-3-ethernet' === connection.type);
    });
  }

  getConnection(type = 'wifi') {
    if ('ethernet' === type)
      return this.getEthernetConnection();
    return this.getWifiConnection();
  }

  getState(type = 'wifi') {
    return this.exec('nmcli -t -f TYPE,STATE d s').then(out => {
      if (out)
        return -1;
      const list = stdout.trim().split(/\n/).map(v => {
        const [type, state] = v.split(':');
        return {
          type,
          state
        };
      });
      const connection = list.find(connection => type === connection.type);
      const state = connection ? 'connected' === connection.state ? 1 : 0 : -1;
      return state;
    });
  }

  _connect(connection) {
    return new Promise(resolve => {
      exec(format('nmcli c u %s', connection.uuid), resolve);
    });
  }

  _disconnect() {
    return this.getActiveConnections().then(connections => {
      return Promise.all(connections.map(connection => {
        return new Promise(resolve => {
          exec(format('nmcli c d %s', connection.uuid), resolve);
        });
      }));
    });
  }

  connect(type = 'wifi') {
    return this.getState(type).then(connected => {
      if (connected)
        return;
      return this._disconnect().then(() => {
        return this.getConnection(type).then(this._connect.bind(this));
      });
    });
  }

  disconnect() {
    return this._disconnect();
  }

  rotateAndroid() {
    const { logger } = this;
    return this.exec('adb shell cmd connectivity airplane-mode').then(async enabled => {
      if (Boolean(Number(enabled)))
        await this.exec('adb shell cmd connectivity airplane-mode disable');
      return this.exec('adb shell settings get global mobile_data').then(async enabled => {
        if (!Boolean(Number(enabled)))
          await this.exec('adb shell settings put global mobile_data 1');
        return this.exec('adb shell cmd connectivity airplane-mode enable').then(() => {
          return this.exec('adb shell cmd connectivity airplane-mode disable').then(() => {
            return asyncDelay(2**10).then(awaitInternet).then(() => {
              logger.info('rotation ok | %s', endTimer('Rotation'));
            });
          });
        });
      });
    });
  }
}

module.exports = NetworkManager;