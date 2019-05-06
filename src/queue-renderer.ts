import { BehaviorSubject, combineLatest, concat, Observable, Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/internal/operators/filter';
import { tap } from 'rxjs/internal/operators/tap';
import { debounceTime, delay, distinctUntilKeyChanged, finalize, flatMap, mapTo, switchMap } from 'rxjs/operators';
import { Browser } from './browser';
import { CachePathJob } from './cache-path-job';
import { config } from './config';

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
      return existingSubject.asObservable();
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

    if (config.debug) {
      console.log('registering job');
    }

    this.queueSubject.next(queue);
    this.containerSubjects[index].next({
      ...container,
      job,
    });
  }

  private handleJob ({ job, browser } : BrowserContainer, containerSubject : BehaviorSubject<BrowserContainer>) {
    if (config.debug) {
      console.log('handling job');
    }

    if (!job) {
      throw new Error('Expected job to be defined, in handling of job');
    }

    const url     = job.getUrl();
    const subject = this.cachedPathToSubject.get(job);

    if (!subject) {
      throw new Error('Unable to retrieve the subject from the cache map');
    }

    return concat(job.devices.map(deviceName => {
      const page = browser.getDevicePage(deviceName);

      console.log('registering device command');
      return page.getUrl()
        .pipe(
          flatMap((previousUrl) => combineLatest([
            url === previousUrl ? page.refresh() : page.open(url),
            page.awaitPageLoad()
              .pipe(
                delay(config.afterDelayDuration),
              ),
          ])),
          flatMap(() => page.getContent()),
          tap(() => console.log('nexting')),
          tap(output => subject.next({ deviceName, output })),
          mapTo(null),
        );
    }))
      .pipe(
        finalize(() => {
          console.log('completing job'); // TODO work this out
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
