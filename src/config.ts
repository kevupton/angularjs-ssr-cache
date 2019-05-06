import * as fs from 'fs';
import { Options as HtmlMinifierOptions } from 'html-minifier';
import path from 'path';
import { updateEnvironment } from 'headless-browser';
import { CachedPathConfig } from './cache-path-job';
import packageJson from './package.json';

export interface Config {
  port : number;
  host : string;
  loopSpeed : number;
  domain : string;
  cachedPaths : CachedPathConfig[];
  cachedDir : string;
  globalCacheDuration : number;
  totalBrowsers : number;
  debug : boolean;
  htmlMinifierConfig : HtmlMinifierOptions;
  readonly version : string;
  afterDelayDuration : number;
}

const DEFAULT_CONFIG : Partial<Config> = {
  port: 1002,
  host: '127.0.0.1',
  debug: false,
  loopSpeed: 20,
  globalCacheDuration: 600,
  totalBrowsers: 2,
  cachedDir: path.join(process.cwd(), './.cache'),
  afterDelayDuration: 0,
};

const configJsonPath = path.join(process.cwd(), './config.json');

if (!fs.existsSync(configJsonPath)) {
  console.log('[ERROR] Cannot find `config.json` file.');
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
  }
});

updateEnvironment({ debug: config.debug });
