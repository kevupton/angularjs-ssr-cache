import * as fs from 'fs';
import path from 'path';
import { updateEnvironment } from 'phantom-crawler-server';
import { CachedPathConfig } from './cache-path-job';

export interface Config {
  loopSpeed : number;
  domain : string;
  cachedPaths : CachedPathConfig[];
  cachedDir : string;
  globalCacheDuration : number;
  totalBrowsers : number;
  debug : boolean;
}

const DEFAULT_CONFIG : Partial<Config> = {
  debug: false,
  loopSpeed: 20,
  globalCacheDuration: 600,
  totalBrowsers: 2,
  cachedDir: path.join(process.cwd(), './.cache'),
};

const configJsonPath = path.join(process.cwd(), './config.json');

if (!fs.existsSync(configJsonPath)) {
  throw new Error('Cannot find `config.json` file.');
}

const configToLoad           = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
export const config : Config = Object.assign(
  DEFAULT_CONFIG,
  configToLoad,
);

updateEnvironment({ debug: config.debug });
