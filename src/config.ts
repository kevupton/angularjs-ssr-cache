import * as fs from 'fs';
import path from 'path';
import { updateEnvironment } from 'phantom-crawler-server';
import { CachedPathConfig } from './cache-path-job';

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
}

const DEFAULT_CONFIG : Partial<Config> = {
  port: 1002,
  host: '127.0.0.1',
  debug: false,
  loopSpeed: 20,
  globalCacheDuration: 600,
  totalBrowsers: 2,
  cachedDir: path.join(process.cwd(), './.cache'),
};

const configJsonPath = path.join(process.cwd(), './config.json');

if (!fs.existsSync(configJsonPath)) {
  console.log('[ERROR] Cannot find `config.json` file.');
  process.exit(0);
}

const configToLoad           = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
export const config : Config = Object.assign(
  DEFAULT_CONFIG,
  configToLoad,
);

updateEnvironment({ debug: config.debug });
