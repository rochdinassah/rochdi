// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');

class CommandManager extends EventEmitter {
  constructor(manager) {
    super();

    const { logger, api_manager, application_id } = manager;

    this.manager = manager;
    this.api_manager = api_manager;
    this.logger = logger;
    this.application_id = application_id;

    this.commands = new Map();
  }

  get size() {
    return this.commands.size;
  }

  fetchCommands() {
    if ('bot' !== this.manager.type)
      return Promise.resolve();
    const { logger, api_manager, application_id } = this;
    return api_manager.get(format('applications/%s/commands', application_id)).then(res => {
      const { status_code, data } = res;
      if (200 !== status_code)
        throw new Error('fetchCommand: request error, http('+status_code+')');
      data.forEach(command => this.commands.set(command.id, command));
    });
  }

  createCommand(opts = {}) {
    const { api_manager, application_id, logger, commands } = this;
    const { name, description } = opts;
    const body = { name, description, type: 1 };
    return api_manager.post(format('application/%s/commands', application_id), body).then(res => {
      const { status_code, data } = res;
      if (200 === status_code)
        return logger.verbose('createCommand: command "%s" already exists', opts.name), false;
      if (201 !== status_code)
        return logger.warn('createCommand: request error, http(%d)', status_code), false;
      commands.set(data.id, data);
      logger.verbose('command "%s" created, commands size: %d', data.name, commands.size);
      return data;
    });
  }

  deleteCommand(command_id) {
    const { api_manager, logger, application_id, commands } = this;
    const command = commands.get(command_id);
    if (!command)
      return logger.warn('deleteCommand: command_id "%s" doesn\'t exist', command_id), Promise.resolve(false);
    return api_manager.get(format('applications/%s/commands/%s', application_id, command_id)).then(res => {
      const { status_code, data } = res;
      if (204 !== status_code)
        return logger.warn('deleteCommand: request error, http(%d)', status_code), false;
      commands.delete(command_id);
      logger.verbose('command "%s" deleted, commands size: %d', command.name, commands.size);
      return true;
    });
  }
}

module.exports = CommandManager;