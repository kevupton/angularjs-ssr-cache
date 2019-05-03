import { combineLatest, interval, Observable } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { first, flatMap, shareReplay } from 'rxjs/operators';
import { cacheManager } from './cache-manager';
import { CachedPath } from './cached-path';
import { config } from './config';

export class Engine {
  private readonly interval = interval(1000 / config.loopSpeed);
  private readonly cachedPaths : CachedPath[];
  private previousRunTime : number;

  constructor () {
    this.cachedPaths = config.cachedPaths.map(config => new CachedPath(config));
  }

  readonly start$ = new Observable<void>(subscriber => {
    cacheManager.clear();

    this.previousRunTime = Date.now();
    const subscription   = this.interval.pipe(
      flatMap(() => {
        const now            = Date.now();
        const timeDifference = now - this.previousRunTime;

        this.previousRunTime = now;
        return this.loop(timeDifference)
          .pipe(
            first(),
          );
      }),
    )
      .subscribe();

    subscriber.add(subscription);
    subscriber.next();
  }).pipe(
    shareReplay(1),
  );

  loop (timeDifference : number) : Observable<any> {
    return combineLatest(
      this.cachedPaths.map(pathCache => pathCache.run(timeDifference) || of(null)),
    );
  }
}
