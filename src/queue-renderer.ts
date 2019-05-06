import { browserManager } from 'headless-browser';
import { Browser } from 'headless-browser/lib/browser/Browser';
import { AsyncSubject, BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { of } from 'rxjs/internal/observable/of';
import { filter } from 'rxjs/internal/operators/filter';
import { tap } from 'rxjs/internal/operators/tap';
import { debounceTime, distinctUntilKeyChanged, flatMap, map, mapTo, shareReplay } from 'rxjs/operators';
import { CachePathJob } from './cache-path-job';
import { config } from './config';

interface BrowserContainer {
  job : CachePathJob | null;
  browser$ : Observable<Browser>;
}

export class QueueRenderer {

  private readonly queueSubject        = new BehaviorSubject<CachePathJob[]>([]);
  private readonly subscriptions       = new Subscription();
  private readonly cachedPathToSubject = new WeakMap<CachePathJob, AsyncSubject<string>>();

  private readonly containerSubjects = this.registerContainers();

  addToQueue (cachedPath : CachePathJob) : Observable<string> {
    const existingSubject = this.cachedPathToSubject.get(cachedPath);

    if (existingSubject) {
      return existingSubject.asObservable();
    }

    const jobCompleteSubject = new AsyncSubject<string>();

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
          browser$: browserManager.openNewInstance()
            .pipe(shareReplay(1)),
          job: null,
        }),
      );

    containerSubjects.forEach(containerSubject => {
      this.registerContainerJobListener(containerSubject);
    });

    const subscription = combineLatest([
      this.queueSubject,
      combineLatest(containerSubjects),
    ])
      .pipe(
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

  private handleJob ({ job, browser$ } : BrowserContainer, containerSubject : BehaviorSubject<BrowserContainer>) {
    if (!job) {
      throw new Error('Expected job to be defined, in handling of job');
    }

    const url = job.getUrl();

    return browser$.pipe(
      flatMap(browser => browser.activePage$),
      flatMap(page => page.getUrl()
        .pipe(
          map(url => ({ page, url })),
        )),
      flatMap(({ page, url: previousUrl }) => combineLatest([
        url === previousUrl ? page.refresh() : page.open(url),
        page.awaitPageLoad(),
        of(page),
      ])),
      flatMap(([, , page]) => page.getContent()),
      tap(content => {
        const subject = this.cachedPathToSubject.get(job);

        if (!subject) {
          throw new Error('Unable to retrieve the subject from the cache map');
        }

        subject.next(content);
        subject.complete();

        // Complete the job so that it can move onto the next job
        containerSubject.next({
          ...containerSubject.value,
          job: null,
        });
      }),
      mapTo(null),
    );
  }
}

export const queueRenderer = new QueueRenderer();
