import { combineLatest, interval, Observable } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { flatMap, shareReplay } from 'rxjs/operators';
import { cacheManager } from './cache-manager';
import { CachePathJob } from './cache-path-job';
import { config } from './config';
import { logger } from './logger';

export class Engine {
  private readonly interval = interval(1000 / config.loopSpeed);
  private readonly cachedPaths : CachePathJob[];
  private previousRunTime : number;

  constructor () {
    this.cachedPaths = config.cachedPaths.map(config => new CachePathJob(config)) || [];
  }

  readonly start$ = new Observable<void>(subscriber => {
    cacheManager.init();

    this.previousRunTime = Date.now();
    const subscription   = this.interval.pipe(
      flatMap(() => {
        const now            = Date.now();
        const timeDifference = now - this.previousRunTime;

        this.previousRunTime = now;
        return this.loop(timeDifference);
      }),
    )
      .subscribe();

    subscriber.add(subscription);
    subscriber.next();
  }).pipe(
    shareReplay(1),
  );

  loop (timeDifference : number) : Observable<any> {
    logger.tick();

    return combineLatest(
      this.cachedPaths.map(pathCache => pathCache.run(timeDifference) || of(null)),
    );
  }
}
