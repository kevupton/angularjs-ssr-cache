import chalk from 'chalk';
import { config } from './config';

export enum LogLevel {
  All     = 0,
  Error   = 1,
  Warning = 2,
  Info    = 3,
  Debug   = 4,
}

class Logger {

  private wasTickLast = false;

  error (item : any) {
    this.write(item, LogLevel.Error, '[ERROR]', '#c53932');
  }

  warning (item : any) {
    this.write(item, LogLevel.Warning, '[WARNING]', '#d78738');
  }

  info (item : any) {
    this.write(item, LogLevel.Info, '[INFO]', '#dac66e');
  }

  debug (item : any) {
    this.write(item, LogLevel.Debug, '[DEBUG]', '#bababa');
  }

  log (item : any) {
    this.write(item, LogLevel.All);
  }

  tick () {
    if (config.logLevel < LogLevel.Debug) {
      return;
    }

    const color = chalk.hex('#464646').dim;

    this.wasTickLast = true;
    process.stdout.write(color('.'));
  }

  private write (output : any, level : LogLevel, prefix = '', color : string = '#ffffff') {
    if (config.logLevel < level) {
      return;
    }

    if (typeof output !== 'string') {
      output = JSON.stringify(output, undefined, 2);
    }

    this.checkTick();

    // const prefixString = prefix ? chalk.bgHex(color).hex('#000000').bold(prefix) + ' ' : '';
    const prefixString = prefix ? chalk.hex(color).dim(prefix) + ' ' : '';
    const mainString = chalk.hex(color)(output);

    process.stdout.write(prefixString + mainString + '\n');
  }

  private checkTick () {
    if (this.wasTickLast) {
      process.stdout.write('\n');
    }
    this.wasTickLast = false;
  }
}

export const logger = new Logger();
