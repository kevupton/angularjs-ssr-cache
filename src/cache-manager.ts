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
  private readonly staticTags = [
    'AngularJS SSR Cache',
    `Version: v${ config.version }`,
  ];

  init () {
    if (config.logLevel >= 3) {
      console.log('Cleared existing cache');
    }
    rimraf(config.cachedDir, () => {
      fs.mkdirSync(config.cachedDir);
    });
  }

  save (path : string, deviceName : string, content : string, tags : string[] = []) {
    if (!fs.existsSync(this.getDevicePath(deviceName))) {
      if (config.logLevel >= 3) {
        console.log(`Creating Cache Device Directory [${ deviceName }]`);
      }
      fs.mkdirSync(this.getDevicePath(deviceName));
    }

    if (config.logLevel >= 3) {
      console.log('Writing Cache to file: ' + this.getPath(path, deviceName));
    }

    const cachedAt = new Date();
    tags.push(`Cached At: ${ cachedAt }`);

    fs.writeFileSync(this.getPath(path, deviceName), JSON.stringify({
      path,
      cachedAt: cachedAt.getTime(),
      content: this.tag(content, tags),
    }));
  }

  read (path : string, deviceName : string) : undefined | CachedFileInfo {
    if (!fs.existsSync(this.getPath(path, deviceName))) {
      return;
    }

    return JSON.parse(fs.readFileSync(this.getPath(path, deviceName), 'utf-8'));
  }

  private tag (html : string, tags : string[]) {
    return `${ html }
<!--
\t${ [
      ...this.staticTags,
      ...tags,
    ].map(tag => `[ ${ tag } ]`).join('\n\t') }
  -->
`;
  }

  private getPath (urlPath : string, deviceName : string) {
    return path.join(this.getDevicePath(deviceName), this.parseString(urlPath));
  }

  private getDevicePath (deviceName : string) {
    return path.join(config.cachedDir, './' + this.parseString(deviceName));
  }

  private parseString (str : string) {
    return str.replace(/([\s\/])/gui, '_');
  }
}

export const cacheManager = new CacheManager();
