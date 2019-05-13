import * as fs from 'fs';
import { Options as HtmlMinifierOptions } from 'html-minifier';
import path from 'path';
import { updateEnvironment } from 'headless-browser';
import { DeviceConfig } from './browser';
import { CachedPathConfig } from './cache-path-job';
import { logger } from './logger';
import packageJson from './package.json';

export interface Config {
  port : number;
  host : string;
  ticksPerSecond : number;
  domain : string;
  cachedPaths : CachedPathConfig[];
  cachedDir : string;
  globalCacheDuration : number;
  totalBrowsers : number;
  logLevel : number;
  minifyHtml : boolean;
  htmlMinifierConfig : HtmlMinifierOptions;
  readonly version : string;
  afterDelayDuration : number;
  devices : DeviceConfig[];
  defaultDevice : string;
  headless : boolean;
}

const DEFAULT_DEVICE_NAME = 'default';

const DEFAULT_CONFIG : Partial<Config> = {
  port: 1002,
  host: '127.0.0.1',
  logLevel: 0,
  ticksPerSecond: 20,
  globalCacheDuration: 600,
  totalBrowsers: 2,
  cachedDir: path.join(process.cwd(), './.cache'),
  afterDelayDuration: 0,
  minifyHtml: true,
  headless: true,
  devices: [
    {
      name: DEFAULT_DEVICE_NAME,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36',
      viewport: {
        width: 1200,
        height: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: false
      }
    }
  ],
};

const configJsonPath = path.join(process.cwd(), './config.json');

if (!fs.existsSync(configJsonPath)) {
  logger.log('[ERROR] Cannot find `config.json` file.');
  process.exit(0);
}

const configToLoad           = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
export const config : Readonly<Config> = Object.assign(
  DEFAULT_CONFIG,
  configToLoad,
);

Object.defineProperties(config, {
  version: {
    configurable: false,
    get () {
      return packageJson.version;
    }
  },
  defaultDevice: {
    configurable: true,
    writable: true,
    value: config.devices[0] && config.devices[0].name || DEFAULT_DEVICE_NAME,
  }
});

updateEnvironment({ debug: config.logLevel >= 3, headless: config.headless });
