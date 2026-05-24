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
    return this.exec('nmcli -t -f UUID,TYPE,NAME,ACTIVE c s').then(out => {
      if (!out)
        return [];
      const list = out.trim().split(/\n/).map(v => {
        const [uuid, type, name, active] = v.split(':');
        return {
          uuid,
          type,
          name,
          active: 'yes' === active
        }
      });
      return list.filter(connection => 'loopback' !== connection.type);
    });
  }

  getActiveConnections() {
    return this.getConnections().then(connections => connections.filter(connection => connection.active));
  }

  getInactiveConnections() {
    return this.getConnections().then(connections => connections.filter(connection => !connection.active));
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

  async getConnection(type = 'wifi') {
    const connection = 'ethernet' === type ? await this.getEthernetConnection() : await this.getWifiConnection();
    if (!connection)
      return asyncDelay(2**12).then(this.getConnection.bind(this, type));
    return connection;
  }

  _connect(connection) {
    const { logger } = this;
    
    if (!connection || connection.active)
      return Promise.resolve();

    return new Promise(resolve => {
      logger.verbose('connecting to "%s"...', connection.type);
      exec(format('nmcli c u %s', connection.uuid), () => {
        logger.verbose('connected to "%s"', connection.type);
        resolve();
      });
    });
  }

  _disconnect(connection) {
    const { logger } = this;

    if (!connection || !connection.active)
      return Promise.resolve();

    return new Promise(resolve => {
      logger.verbose('disconnecting from "%s"...', connection.type);
      exec(format('nmcli c d %s', connection.uuid), () => {
        logger.verbose('disconnected from "%s"', connection.type);
        resolve();
      });
    });
  }

  disconnect(type) {
    const { logger } = this;

    return this.getActiveConnections().then(async active_connections => {
      if (!active_connections.length)
        return;

      const connections = !type ? active_connections : [];

      if ('wifi' === type)
        connections.push(await this.getWifiConnection());
      else if ('ethernet' === type)
        connections.push(await this.getEthernetConnection());

      return Promise.all(connections.map(this._disconnect.bind(this)));
    });
  }

  connect(type = 'wifi') {
    return this.getConnection('wifi' === type ? 'ethernet' : 'wifi').then(connection => {
      return this._disconnect(connection).then(() => {
        return this.getConnection(type).then(this._connect.bind(this));
      });
    });
  }

  rotateAndroid() {
    const { logger } = this;
    startTimer('Rotation');
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