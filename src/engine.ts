import { combineLatest, Observable } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { finalize, share } from 'rxjs/operators';
import { cacheManager } from './cache-manager';
import { CachePathJob } from './cache-path-job';
import { config } from './config';
import { logger } from './logger';

export class Engine {
  private readonly jobs : CachePathJob[];
  private readonly loopSpeed = 1000 / config.ticksPerSecond;
  private previousRunTime : number;
  private running            = false;

  constructor () {
    this.jobs = config.cachedPaths.map(config => new CachePathJob(config)) || [];
  }

  readonly start$ = new Observable<void>(subscriber => {
    cacheManager.init();

    this.previousRunTime = Date.now();
    this.running         = true;

    this.runLoop();
  }).pipe(
    finalize(() => this.running = false),
    share(),
  );

  loop (timeDifference : number) : Observable<any> {
    logger.tick();

    return combineLatest(
      this.jobs.map(job => job.run(timeDifference) || of(null)),
    );
  }

  private runLoop () {
    if (!this.running) {
      return;
    }

    const now            = Date.now();
    const timeDifference = now - this.previousRunTime;

    if ((now - this.previousRunTime) >= this.loopSpeed) {
      this.previousRunTime = now;
      this.loop(timeDifference).subscribe({
        error: e => logger.error(e),
      });
    }

    /**
     * Loop to get rid of memory leaks
     */
    process.nextTick(() => this.runLoop());
  }
}
