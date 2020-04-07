import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import * as NonEmptyArray_ from 'fp-ts/lib/NonEmptyArray';

export type SIteratorResult<A> = IteratorResult<A, A>;

export type SIterator<A> = Iterator<A, A, never>;
export function* sIterator<A>(nea: NonEmptyArray<A>): SIterator<A> {
  // eslint-disable-next-line
  for (const a of NonEmptyArray_.init(nea)) {
    yield a;
  }
  return NonEmptyArray_.last(nea);
}

export function* sequenceT<I extends Array<SIterator<any>>>(
  ...iterators: I
): SIterator<{ [K in keyof I]: I[K] extends SIterator<infer A> ? A : never }> {
  // eslint-disable-next-line
  while (true) {
    const results: Array<SIteratorResult<unknown>> = iterators.map((i) => i.next());
    const done = results.some((r) => r.done);
    if (done) {
      return results as any;
    }
    yield results as any;
  }
}

export function map<A, B>(f: (a: A) => B) {
  return function* (ia: SIterator<A>): SIterator<B> {
    // eslint-disable-next-line
    while (true) {
      const { done, value: a } = ia.next();
      const b = f(a);
      if (done) {
        return b;
      }
      yield b;
    }
  };
}
