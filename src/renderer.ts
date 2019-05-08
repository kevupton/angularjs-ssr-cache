import { NavigationOptions } from 'puppeteer';
import { BehaviorSubject, combineLatest, Observable, Subject } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { filter } from 'rxjs/internal/operators/filter';
import { first } from 'rxjs/internal/operators/first';
import { tap } from 'rxjs/internal/operators/tap';
import {
  catchError,
  debounceTime,
  delay,
  distinctUntilKeyChanged,
  flatMap,
  map,
  mapTo,
  shareReplay,
  switchMap,
} from 'rxjs/operators';
import { Browser } from './browser';
import { CachePathJob } from './cache-path-job';
import { config } from './config';
import { concatComplete } from './lib/concat-complete';
import { logger } from './logger';
import { Queue } from './queue';

interface Job {
  readonly ref : CachePathJob;
  readonly result : Subject<DeviceOutput>;
}

export interface BrowserContainer {
  job : Job | null;
  readonly browser : Browser;
}

export interface DeviceOutput {
  readonly deviceName : string;
  readonly content : string;
  readonly headers : Record<string, string>;
  readonly tags : string[];
}

export class Renderer {

  private readonly containerSubjects = this.registerContainers();
  private readonly queue             = new Queue(config.totalBrowsers);

  private readonly setup$ = combineLatest([
    combineLatest(this.containerSubjects.map(subject => subject.value.browser.launch$)), // Launch each browser
  ]).pipe(
    tap(() => {
      this.containerSubjects.map(subject => this.registerContainerJobListener(subject));
      logger.info('Listening for Jobs');
    }), // Listen to each browser event
    mapTo(undefined),
    shareReplay(1),
  );

  render (job : CachePathJob) : Observable<DeviceOutput> {
    return this.queue.addToQueue(
      this.setup$.pipe(flatMap(() => this.mainTask(job))),
    );
  }

  private mainTask (ref : CachePathJob) {
    return combineLatest(this.containerSubjects).pipe(
      map(containers => containers.findIndex(container => !container.job)),
      filter(index => index !== -1),
      first(),
      switchMap(index => {
        const result = new Subject<DeviceOutput>();

        this.assignJobToContainer(index, { ref, result });

        result.subscribe({
          complete: () => this.assignJobToContainer(index),
        });

        return result;
      }),
    );
  }

  private assignJobToContainer (index : number, job : Job | null = null) {
    this.containerSubjects[index].next({
      ...this.containerSubjects[index].value,
      job,
    });
  }

  private registerContainers () {
    return Array.from(Array(config.totalBrowsers))
      .map(() =>
        new BehaviorSubject<BrowserContainer>({
          browser: new Browser(),
          job: null,
        }),
      );
  }

  private registerContainerJobListener (containerSubject : BehaviorSubject<BrowserContainer>) : any {
    return containerSubject.pipe(
      debounceTime(0),
      distinctUntilKeyChanged('job'),
      filter(({ job }) => job !== null),
      flatMap(container => this.handleJob(container)),
    ).subscribe();
  }

  private handleJob ({ job, browser } : BrowserContainer) {
    logger.debug('handling job');

    if (!job) {
      throw new Error('Expected job to be defined, in handling of job');
    }

    const { ref, result } = job;
    const url             = ref.getUrl();

    return concatComplete(ref.devices.map(deviceName => {
      const page = browser.getDevicePage(deviceName);

      return page.bringToFront().pipe(
        flatMap(() => page.getUrl()),
        map(previousUrl => {
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
        flatMap(request$ => combineLatest([
          request$,
          page.on$('response').pipe(
            map(([response]) => response),
            filter((response) => response.url() === url),
            first(),
          ),
        ])),
        flatMap(([, response]) => page.getContent().pipe(
          map(content => ({ content, response })),
        )),
        tap(({ content, response }) => result.next({
          deviceName,
          content,
          headers: response.headers(),
          tags: [`Device: ${ deviceName }`],
        })),
        catchError(e => {
          logger.error(e);
          return of(null);
        }),
        mapTo(null),
      );
    }))
      .pipe(
        tap(() => result.complete()),
      );
  }
}

export const renderer = new Renderer();
