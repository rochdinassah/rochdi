'use strict';

const readline = require('node:readline');
const EventEmitter = require('node:events');

const { stdin, stdout } = process;

class Command extends EventEmitter {
  constructor() {
    super();
    
    this.on('line', this.onLine);
  }

  start() {
    this.interface = readline.createInterface({ input: stdin, output: stdout })
      .on('close', this.onclose.bind(this))
      .on('line', this.onLine.bind(this));
  }

  end() {
    this.interface.close();
  }

  onclose() {
    this.emit('close');
  }

  onLine(line) {
    const [cmd, ...args] = line.split(' ');
    this.emit(cmd, ...args);
  }
}

module.exports = Command;