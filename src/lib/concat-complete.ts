import { Observable } from 'rxjs';
import { concat } from 'rxjs/internal/observable/concat';

export function concatComplete (observers : Observable<any>[]) {
  return new Observable<void>(subscriber => {
    subscriber.add(
      concat(...observers)
        .subscribe({
          complete: () => {
            subscriber.next();
            subscriber.complete();
          },
        }),
    );
  });
}
