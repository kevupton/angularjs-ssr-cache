import { tap } from 'rxjs/internal/operators/tap';
import { Engine } from './engine';
import { startServer } from './server';
import 'babel-polyfill';

export function run () {
  const engine = new Engine();

  return engine.start$.pipe(
    tap(() => startServer())
  );
}
