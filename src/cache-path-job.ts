import { minify } from 'html-minifier';
import { flatMap, mapTo } from 'rxjs/operators';
import { cacheManager } from './cache-manager';
import { config } from './config';
import { logger } from './logger';
import { DeviceOutput, renderer } from './renderer';

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

    logger.debug('adding to queue ' + this.getUrl());

    return renderer.render(this)
      .pipe(
        flatMap((deviceOutput) => {
          logger.debug('Sending to cache');
          return cacheManager.save(this.path, this.minify(deviceOutput));
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

  private minify (deviceOutput : DeviceOutput) : DeviceOutput {
    if (!config.minifyHtml) {
      return deviceOutput;
    }

    try {
      return {
        ...deviceOutput,
        content: minify(deviceOutput.content, config.htmlMinifierConfig),
        tags: [ ...deviceOutput.tags, 'Minified' ]
      }
    }
    catch (e) {
      logger.error('Failed to Minify HTML ' + e.message.substr(0, 50));
      return deviceOutput;
    }
  }
}
