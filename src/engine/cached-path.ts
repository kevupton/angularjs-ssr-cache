import { Observable } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { config } from '../config';

export interface CachedPathConfig {
  path : string;
  cacheDuration? : number;
}

export class CachedPath {

  private readonly cacheDurationMs : number;
  private readonly path : string;
  private countDown = 0;

  constructor(
    { path, cacheDuration } : CachedPathConfig
  ) {
    this.cacheDurationMs = cacheDuration ? cacheDuration * 1000 : config.globalCacheDuration * 1000;
    this.path = path;

    if (!this.path) {
      throw new Error('Invalid path provided for cached path');
    }
  }

  public run (timeDifference : number) : Observable<any> {
    if (!this.shouldRun(timeDifference)) {
      return of(null);
    }


  }

  private shouldRun (timeDifference : number) {
    this.countDown -= timeDifference;

    if (this.countDown <= 0) {
      this.countDown = this.cacheDurationMs;
      return true;
    }

    return false;
  }
}
