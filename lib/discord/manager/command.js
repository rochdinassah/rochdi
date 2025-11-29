// author: rochdi nassah

'use strict';

const EventEmitter = require('node:events');
const CommandObject = require('../object/command');

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
    const { manager, commands, logger, api_manager, application_id } = this;

    if ('bot' !== manager.type)
      return Promise.resolve();

    return api_manager.get('/applications/'+application_id+'/commands').then(res => {
      const { status_code, data } = res;

      if (200 !== status_code)
        throw new Error('fetchCommand: request error, http('+status_code+')');

      data.forEach(infos => commands.set(infos.id, new CommandObject(manager, infos)));
    });
  }

  createCommand(opts = {}) {
    const { api_manager, application_id, logger, manager, commands } = this;

    let { name, description } = opts;
    name = opts.name.toLowerCase();

    return api_manager.post('/applications/'+application_id+'/commands', { name, description, type: 1 }).then(res => {
      const { status_code, data } = res;

      if (200 === status_code)
        return logger.verbose('createCommand: command "%s" already exists', name), false;

      if (201 !== status_code)
        return logger.warn('createCommand: request error, http(%d)', status_code), false;

      return (
        commands.set(data.id, new CommandObject(manager, data)),
        logger.verbose('command "%s" created, commands size: %d', data.name, commands.size),
        data
      );
    });
  }

  deleteCommand(command_id) {
    const { api_manager, logger, application_id, commands } = this;
    const command = commands.get(command_id);

    if (!command)
      return logger.warn('deleteCommand: command_id "%s" doesn\'t exist', command_id), Promise.resolve(false);

    return api_manager.delete('/applications/'+application_id+'/commands/'+command_id).then(res => {
      const { status_code, data } = res;
      
      if (204 !== status_code)
        return logger.warn('deleteCommand: request error, http(%d)', status_code), false;

      return (
        commands.delete(command_id),
        logger.verbose('command "%s" deleted, commands size: %d', command.name, commands.size),
        true
      );
    });
  }

  async deleteCommands(exclude = []) {
    const { commands } = this;

    const exclude_ids = exclude.map(id => {
      const command = this.getCommand(id);
      return command.id;
    });

    for (const command of commands.values()) {
      if (exclude_ids.includes(command.id))
        continue;
      await this.deleteCommand(command.id);
      await new Promise(resolve => setTimeout(resolve, 1e3));
    }
  }

  getCommands() {
    return [...this.commands.values()];
  }

  getCommand(id) {
    const { commands } = this;

    if (!/^[a-z]/i.test(id))
      return commands.get(id);

    const regexp = new RegExp(id);

    for (const command of commands.values())
      if (regexp.test(command.name))
        return command;
  }

  hasCommand(id) {
    const { commands } = this;

    if (!/^[a-z]/i.test(id))
      return commands.has(id);

    const regexp = new RegExp(id);

    for (const command of commands.values())
      if (regexp.test(command.name))
        return true;
    return false
  }
}

module.exports = CommandManager;