import { tap } from 'rxjs/internal/operators/tap';
import { mapTo } from 'rxjs/operators';
import { cacheManager } from './cache-manager';
import { config } from './config';
import { queueRenderer } from './queue-renderer';

export interface CachedPathConfig {
  path : string;
  cacheDuration? : number;
}

export class CachedPath {

  private readonly cacheDurationMs : number;
  private readonly path : string;
  private countDown = 0;

  constructor (
    { path, cacheDuration } : CachedPathConfig,
  ) {
    this.cacheDurationMs = cacheDuration ? cacheDuration * 1000 : config.globalCacheDuration * 1000;
    this.path            = path;

    if (!this.path) {
      throw new Error('Invalid path provided for cached path');
    }
  }

  public run (timeDifference : number) {
    if (!this.shouldRun(timeDifference)) {
      return;
    }

    return queueRenderer.addToQueue(this)
      .pipe(
        tap(result => cacheManager.save(this.path, result)),
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
}
