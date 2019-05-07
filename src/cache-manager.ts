import fs from 'fs';
import path from 'path';
import rimraf from 'rimraf';
import { Observable } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { tap } from 'rxjs/internal/operators/tap';
import { flatMap, map, mapTo } from 'rxjs/operators';
import { config } from './config';
import { logger } from './logger';

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
    logger.debug('Cleared existing cache');
    rimraf(config.cachedDir, () => {
      fs.mkdirSync(config.cachedDir);
    });
  }

  save (path : string, deviceName : string, content : string, tags : string[] = []) : Observable<void> {
    return this.makeDirectoryIfNotExists(deviceName).pipe(
      flatMap(() => {
        const cachedAt = new Date();
        tags.push(`Cached At: ${ cachedAt }`);

        const cachedInfo : CachedFileInfo = {
          path,
          cachedAt: cachedAt.getTime(),
          content: this.tag(content, tags),
        };

        logger.info('Writing Cache to file: ' + this.getPath(path, deviceName));
        return this.writeFile(this.getPath(path, deviceName), JSON.stringify(cachedInfo));
      }),
      tap(() => logger.debug('Successfully Written')),
      mapTo(undefined),
    );
  }

  read (path : string, deviceName : string) : Observable<undefined | CachedFileInfo> {
    return this.checkExists(this.getPath(path, deviceName)).pipe(
      flatMap(exists => {
        if (!exists) {
          return of(null);
        }

        return this.readFile(this.getPath(path, deviceName));
      }),
      map(content => content ? JSON.parse(content) : undefined),
    );
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

  private readFile (path : string) : Observable<string> {
    return new Observable(subscriber => {
      fs.readFile(path, 'utf-8', (err, content) => {
        if (err) {
          subscriber.error(err);
          return;
        }

        subscriber.next(content);
        subscriber.complete();
      });
    });
  }

  private writeFile (path : string, content : string) : Observable<void> {
    return new Observable(subscriber => {
      fs.writeFile(path, content, err => {
        if (err) {
          subscriber.error(err);
          return;
        }

        subscriber.next();
        subscriber.complete();
      });
    });
  }

  private checkExists (path : string) : Observable<boolean> {
    return new Observable(subscriber => {
      fs.stat(path, err => {
        subscriber.next(!err);
        subscriber.complete();
      });
    });
  }

  private makeDirectoryIfNotExists (path : string) {
    return this.checkExists(this.getDevicePath(path)).pipe(
      flatMap(exists => {
        if (exists) {
          return of(null);
        }

        logger.debug(`Creating Cache Device Directory [${ path }]`);
        return this.makeDirectory(this.getDevicePath(path));
      }),
    );
  }

  private makeDirectory (path : string) : Observable<void> {
    return new Observable(subscriber => {
      fs.mkdir(path, err => {
        if (err) {
          subscriber.error(err);
          return;
        }

        subscriber.next();
        subscriber.complete();
      });
    });
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
