import { config } from './config';

enum LogLevel {
  Error = 1,
  Warning = 2,
  Info = 3,
  Debug = 4,
}

class Logger {
  error(...args : any[]) {
    if (config.logLevel < LogLevel.Error) {
      return;
    }

    console.error(...args);
  }

  warning(...args : any) {
    if (config.logLevel < LogLevel.Warning) {
      return;
    }

    console.warn(...args);
  }

  info(...args : any) {
    if (config.logLevel < LogLevel.Info) {
      return;
    }

    console.info(...args);
  }

  debug(...args : any) {
    if (config.logLevel < LogLevel.Debug) {
      return;
    }

    console.debug(...args);
  }

  log(...args : any) {
    console.log(...args);
  }
}

export const logger = new Logger();
