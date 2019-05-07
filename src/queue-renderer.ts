import { NavigationOptions } from 'puppeteer';
import { BehaviorSubject, combineLatest, Observable, Subject, Subscription } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { filter } from 'rxjs/internal/operators/filter';
import { tap } from 'rxjs/internal/operators/tap';
import { catchError, debounceTime, delay, distinctUntilKeyChanged, flatMap, mapTo, switchMap } from 'rxjs/operators';
import { Browser } from './browser';
import { CachePathJob } from './cache-path-job';
import { config } from './config';
import { concatComplete } from './lib/concat-complete';
import { logger } from './logger';

export interface BrowserContainer {
  job : CachePathJob | null;
  readonly browser : Browser;
}

export interface DeviceOutput {
  readonly deviceName : string;
  readonly output : string;
}

export class QueueRenderer {

  private readonly queueSubject        = new BehaviorSubject<CachePathJob[]>([]);
  private readonly subscriptions       = new Subscription();
  private readonly cachedPathToSubject = new WeakMap<CachePathJob, Subject<DeviceOutput>>();

  private readonly containerSubjects = this.registerContainers();

  addToQueue (cachedPath : CachePathJob) : Observable<DeviceOutput> {
    const existingSubject = this.cachedPathToSubject.get(cachedPath);

    if (existingSubject) {
      // just wait for this observable to complete
      return existingSubject.asObservable().pipe(
        filter(() => false),
      );
    }

    const jobCompleteSubject = new Subject<DeviceOutput>();

    this.cachedPathToSubject.set(cachedPath, jobCompleteSubject);
    this.queueSubject.next([
      ...this.queueSubject.value,
      cachedPath,
    ]);

    return jobCompleteSubject.asObservable();
  }

  private registerContainers () {
    const containerSubjects = Array.from(Array(config.totalBrowsers))
      .map(() =>
        new BehaviorSubject<BrowserContainer>({
          browser: new Browser(),
          job: null,
        }),
      );

    containerSubjects.forEach(containerSubject => {
      this.registerContainerJobListener(containerSubject);
    });

    const subscription = combineLatest(
      containerSubjects.map(subject => subject.value.browser.launch$),
    )
      .pipe(
        switchMap(() => combineLatest([
          this.queueSubject,
          combineLatest(containerSubjects),
        ])),
        debounceTime(0), // dont run the changes straight away
      )
      .subscribe(([, containers]) => {
        containers.forEach((container, index) => this.tryCreateJob(container, index));
      });

    this.subscriptions.add(subscription);

    return containerSubjects;
  }

  private registerContainerJobListener (containerSubject : BehaviorSubject<BrowserContainer>) : any {
    this.subscriptions.add(containerSubject.pipe(
      debounceTime(0),
      distinctUntilKeyChanged('job'),
      filter(({ job }) => job !== null),
      flatMap(container => this.handleJob(container, containerSubject)),
    )
      .subscribe());
  }

  private tryCreateJob (
    container : BrowserContainer,
    index : number,
  ) {
    if (this.queueSubject.value.length === 0 || container.job) {
      return;
    }

    const queue = [...this.queueSubject.value];
    const job   = queue.shift();

    if (!job) {
      return;
    }

    logger.debug('registering job');

    this.queueSubject.next(queue);
    this.containerSubjects[index].next({
      ...container,
      job,
    });
  }

  private handleJob ({ job, browser } : BrowserContainer, containerSubject : BehaviorSubject<BrowserContainer>) {
    logger.debug('handling job');

    if (!job) {
      throw new Error('Expected job to be defined, in handling of job');
    }

    const url     = job.getUrl();
    const subject = this.cachedPathToSubject.get(job);

    if (!subject) {
      throw new Error('Unable to retrieve the subject from the cache map');
    }

    return concatComplete(job.devices.map(deviceName => {
      const page = browser.getDevicePage(deviceName);

      return page.bringToFront().pipe(
        flatMap(() => page.getUrl()),
        flatMap((previousUrl) => {
          const options : NavigationOptions = {
            waitUntil: 'networkidle0',
            timeout: 120000,
          };

          if (url === previousUrl) {
            logger.debug('Refreshing Page ...');
            return page.refresh(options);
          }

          return page.open(url, options).pipe(delay(config.afterDelayDuration));
        }),
        flatMap(() => page.getContent()),
        tap(output => subject.next({ deviceName, output })),
        catchError(e => {
          logger.error(e);
          return of(null);
        }),
        mapTo(null),
      );
    }))
      .pipe(
        tap(() => {
          subject.complete();

          // Complete the job so that it can move onto the next job
          this.cachedPathToSubject.delete(job);
          containerSubject.next({
            ...containerSubject.value,
            job: null,
          });
        }),
      );
  }
}

export const queueRenderer = new QueueRenderer();
