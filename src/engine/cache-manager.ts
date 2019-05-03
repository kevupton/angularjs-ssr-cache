import fs from 'fs';
import rimraf from 'rimraf';
import path from 'path';
import { config } from '../config';

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

  private getPath (urlPath : string) {
    return path.join(config.cachedDir, urlPath.replace(/([\s\/])/gui, '\\$1'));
  }
}

export const cacheManager = new CacheManager();
