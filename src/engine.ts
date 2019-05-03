import { combineLatest, interval, Observable } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { filter } from 'rxjs/internal/operators/filter';
import { tap } from 'rxjs/internal/operators/tap';
import { first, flatMap, shareReplay } from 'rxjs/operators';
import { cacheManager } from './cache-manager';
import { CachedPath } from './cached-path';
import { config } from './config';

export class Engine {
  private readonly interval = interval();
  private readonly cachedPaths : CachedPath[];
  private runningLoop       = false;
  private previousRunTime : number;

  constructor () {
    this.cachedPaths = config.cachedPaths.map(config => new CachedPath(config));
  }

  readonly start$ = new Observable<void>(subscriber => {
    cacheManager.clear();

    this.previousRunTime = Date.now();
    const subscription   = this.interval.pipe(
      filter(() => !this.runningLoop),
      tap(() => this.runningLoop = true),
      flatMap(() => {
        const now            = Date.now();
        const timeDifference = now - this.previousRunTime;

        this.previousRunTime = now;
        return this.loop(timeDifference)
          .pipe(
            first(),
          );
      }),
      tap(() => this.runningLoop = false),
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
