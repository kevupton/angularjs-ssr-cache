import { minify } from 'html-minifier';
import { tap } from 'rxjs/internal/operators/tap';
import { map, mapTo } from 'rxjs/operators';
import { cacheManager } from './cache-manager';
import { config } from './config';
import { queueRenderer } from './queue-renderer';

export interface CachedPathConfig {
  path : string;
  cacheDuration? : number;
}

export class CachePathJob {

  private readonly cacheDurationMs : number;
  private readonly path : string;
  private countDown = 0;

  constructor (
    { path, cacheDuration } : CachedPathConfig,
  ) {
    this.cacheDurationMs = cacheDuration ? cacheDuration * 1000 : config.globalCacheDuration * 1000;
    this.path            = path.startsWith('/') ? path : `/${ path }`;

    if (!this.path) {
      throw new Error('Invalid path provided for cached path');
    }
  }

  public run (timeDifference : number) {
    if (!this.shouldRun(timeDifference)) {
      return;
    }

    if (config.debug) {
      console.log('adding to queue ' + this.getUrl());
    }

    return queueRenderer.addToQueue(this)
      .pipe(
        map(content => minify(content, config.htmlMinifyConfig)),
        map(content => this.tag(content)),
        tap(result => {
          if (config.debug) {
            console.log('saving result');
          }
          cacheManager.save(this.path, result);
        }),
        mapTo(null),
      );
  }

  private shouldRun (timeDifference : number) {
    this.countDown -= timeDifference;

    if (this.countDown <= 0) {
      this.countDown = this.cacheDurationMs;
      return true;
    }

    return false;
  }

  public getUrl () {
    return config.domain + this.path;
  }

  private tag (html : string) {
    return `${ html }<!-- [ AngularJS SSR Cache -- v${ config.version } ] -->`;
  }
}
