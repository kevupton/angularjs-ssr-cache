import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/internal/operators/filter';
import { tap } from 'rxjs/internal/operators/tap';
import { debounceTime, flatMap, map } from 'rxjs/operators';

export interface QueueItem<T = any> {
  obs$ : Observable<T>;
  subscriber : Subject<T>;
}

export class Queue {
  private readonly queueSubject = new BehaviorSubject<QueueItem[]>([]);
  private running               = 0;

  constructor (
    private readonly maxRunning = 1,
  ) {
    this.registerQueueListener();
  }

  public addToQueue<T> (obs$ : Observable<T>) : Observable<T> {
    const item : QueueItem<T> = {
      obs$,
      subscriber: new Subject<T>(),
    };

    this.queueSubject.next([
      ...this.queueSubject.value,
      item,
    ]);

    return item.subscriber.asObservable();
  }

  private registerQueueListener () {
    return this.queueSubject.pipe(
      filter(queue => queue.length > 0 && this.running < this.maxRunning),
      tap(() => this.running++),
      debounceTime(0),
      map(() => this.queueSubject.value),
      map(([item, ...remaining]) => {
        this.queueSubject.next(remaining);
        return item;
      }),
      flatMap(item => this.handle(item)),
      tap(() => {
        this.running--;
        this.queueSubject.next(this.queueSubject.value);
      }),
    ).subscribe();
  }

  private handle (item : QueueItem) {
    return new Observable(subscriber => {
      subscriber.add(item.obs$.subscribe({
        next: (value) => item.subscriber.next(value),
        complete: () => {
          subscriber.next();
          subscriber.complete();
          item.subscriber.complete();
        },
      }));
    });
  }
}
