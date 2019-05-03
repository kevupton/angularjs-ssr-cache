import { browserManager } from 'phantom-crawler-server';
import { Browser } from 'phantom-crawler-server/lib/browser/Browser';
import { BehaviorSubject, combineLatest, Observable, Subject, Subscription } from 'rxjs';
import { debounce, debounceTime, flatMap, shareReplay } from 'rxjs/operators';
import { config } from './config';
import { CachedPath } from './engine/cached-path';

interface BrowserContainer {
  job : CachedPath | null;
  browser$ : Observable<Browser>;
}

export class Renderer {

  private readonly queueSubject = new BehaviorSubject<CachedPath[]>([]);
  private readonly containerSubjects = this.registerContainers();
  private readonly subscription = new Subscription();

  addToQueue(cachedPath : CachedPath) {
    const jobCompleteSubject = new Subject();



    return jobCompleteSubject.asObservable();
  }

  private registerContainers() {
    const containerSubjects = Array.from(Array(config.totalBrowsers)).map(() =>
      new BehaviorSubject<BrowserContainer>({
        browser$: browserManager.openNewInstance().pipe(shareReplay(1)),
        job: null,
      }),
    );

    combineLatest([
      this.queueSubject,
      combineLatest(containerSubjects),
    ]).pipe(
      debounceTime(0), // dont run the changes straight away
    ).subscribe(([queue, containers]) => {
      if (!queue.length) {
        return;
      }

      const newQueue = queue.concat();
      containers.forEach((container, index) => this.tryCreateJob(container, newQueue, index));

      if (newQueue.length !== queue.length) {
        this.queueSubject.next(newQueue);
      }
    });


    return containerSubjects;
  }

  private tryCreateJob (
    container : BrowserContainer,
    queue : CachedPath[],
    index : number,
  ) {
    if (container.job) {
      return;
    }

    const job = queue.shift();

    if (!job) {
      return;
    }

    this.containerSubjects[index].next({
      ...container,
      job,
    });

    container.browser$.pipe(
      flatMap(browser => browser.activePage$),
      flatMap(page => page.open(job.getUrl())),
    )
  }
}

export const renderer = new Renderer();
