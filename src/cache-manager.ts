import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { config } from './config';

export interface CachedFileInfo {
  path : string;
  cachedAt : number;
  content : string;
}

class CacheManager {
  clear () {
    rimraf(config.cachedDir, () => {
      console.log('Cleared existing cache');
    });
  }

  save (path : string, content : string) {
    fs.writeFileSync(this.getPath(path), JSON.stringify({
      path, cachedAt: Date.now(), content,
    }));
  }

  read (path : string) : undefined | CachedFileInfo {
    if (!fs.existsSync(this.getPath(path))) {
      return;
    }

    return JSON.parse(fs.readFileSync(this.getPath(path), 'utf-8'));
  }

  private getPath (urlPath : string) {
    return path.join(config.cachedDir, urlPath.replace(/([\s\/])/gui, '\\$1'));
  }
}

export const cacheManager = new CacheManager();
