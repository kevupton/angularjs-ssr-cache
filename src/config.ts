import path from 'path';
import { CachedPathConfig } from './engine/cached-path';

export interface Config {
  domain : string;
  cachedPaths : CachedPathConfig[];
  cachedDir : string;
  globalCacheDuration : number;
  totalBrowsers : number;
}

const DEFAULT_CONFIG : Partial<Config> = {
  globalCacheDuration: 600,
  totalBrowsers: 4,
};

export const config : Config = Object.assign(
  DEFAULT_CONFIG,
  require(path.join(process.cwd(), './config.json'))
);

if (!config) {
  throw new Error('Cannot find `config.json` file.');
}

if (!config.cachedDir) {
  config.cachedDir = path.join(process.cwd(), './.cache');
}
