import { minify } from 'html-minifier';
import { tap } from 'rxjs/internal/operators/tap';
import { mapTo } from 'rxjs/operators';
import { cacheManager } from './cache-manager';
import { config } from './config';
import { queueRenderer } from './queue-renderer';

export interface CachedPathConfig {
  path : string;
  cacheDuration? : number;
  devices? : string[];
}

export class CachePathJob {

  public readonly devices : string[];
  private readonly cacheDurationMs : number;
  private readonly path : string;

  private countDown = 0;

  constructor (
    { path, cacheDuration, devices } : CachedPathConfig,
  ) {
    this.cacheDurationMs = cacheDuration ? cacheDuration * 1000 : config.globalCacheDuration * 1000;
    this.path            = path.startsWith('/') ? path : `/${ path }`;
    this.devices         = devices || config.devices.map(({ name }) => name); // default to use all the devices

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
        tap(({ deviceName, output }) => {
          const result = this.tag(this.minify(output), deviceName);
          if (config.debug) {
            console.log('saving result');
          }
          cacheManager.save(this.path, deviceName, result);
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

  private tag (html : string, deviceName : string) {
    return `${ html }<!-- [ AngularJS SSR Cache ] [ Version: v${ config.version } ] [ Device: ${ deviceName } ] [ Created At: ${ Date.now() } ] -->`;
  }

  private minify (html : string) {
    if (!config.minifyHtml) {
      return html;
    }

    try {
      return `${ minify(html, config.htmlMinifierConfig) }<!-- Minified By AngularJS SSR Cache -->`;
    }
    catch (e) {
      console.log('Failed to Minify HTML', e.message.substr(0, 50));
      return html;
    }
  }
}
