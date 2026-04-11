// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class RoleManager extends EventEmitter {
  constructor(manager) {
    super();
    
    const { logger, connection_manager, guild_manager, api_manager } = manager;

    this.manager = manager;
    this.connection_manager = connection_manager;
    this.guild_manager = guild_manager;
    this.api_manager = api_manager;
    this.logger = logger;

    this.startListen(connection_manager);
  }

  startListen(connection) {

  }

  createRole() {

  }

  deleteRole(guild_id, role_id) {
    const { logger, api_manager } = this;
    return api_manager.delete('/guilds/'+guild_id+'/roles/'+role_id).then(res => {
      const { status_code, data } = res;

      if (204 !== status_code)
        return logger.warn('deleteRole: request error, http(%d)', status_code), false;
    
      logger.verbose('role "%s" deleted', role_id);
      return true;
    });
  }

  updateRole() {
    
  }
}

module.exports = RoleManager;