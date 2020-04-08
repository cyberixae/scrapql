import { pipe } from 'fp-ts/lib/pipeable';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import * as NonEmptyArray_ from 'fp-ts/lib/NonEmptyArray';

export type SIteratorResult<A> = IteratorResult<A, A>;

export type SIterator<A> = () => Generator<A, A, undefined>;
export function sIterator<A>(nea: NonEmptyArray<A>): SIterator<A> {
  return function* () {
    // eslint-disable-next-line
    for (const a of NonEmptyArray_.init(nea)) {
      yield a;
    }
    return NonEmptyArray_.last(nea);
  };
}

export function fromGF<A>(gf: () => Generator<A, void, undefined>): SIterator<A> {
  return function* (): Generator<A, A, undefined> {
    const handle = gf();
    const first = handle.next();
    if (first.done) {
      // eslint-disable-next-line
      throw new Error('Empty generator');
    }
    // eslint-disable-next-line
    let previous = first;
    // eslint-disable-next-line
    while (true) {
      // eslint-disable-next-line
      let current = handle.next();
      if (current.done) {
        return previous.value;
      }
      yield previous.value,
        // eslint-disable-next-line
      previous = current;
    }
  };
}

export function map<A, B>(f: (a: A) => B) {
  return function (gen: SIterator<A>): SIterator<B> {
    return fromGF(function* () {
      // eslint-disable-next-line
      const handle = gen();
      // eslint-disable-next-line
      while(true) {
        // eslint-disable-next-line
        let { done, value } = handle.next();
        yield f(value);
        if (done) {
          break;
        }
      }
    });
  };
}

export function sequenceT<I extends NonEmptyArray<SIterator<any>>>(
  ...generators: I
): SIterator<{ [K in keyof I]: I[K] extends SIterator<infer A> ? A : never }> {
  return fromGF(function* () {
    const [first, ...more] = generators;
    console.log('muumi1');
    console.log(first);
    console.log(more);
    if (more.length === 0) {
      // eslint-disable-next-line
      for (const v of first()) {
        yield v;
      }
      return;
    }
    console.log('muumi2');
    console.log(first);
    console.log(more);
    const tails = sequenceT(...(more as any));
    // eslint-disable-next-line
    for (const head of first()) {
      yield* pipe(
        tails,
        map((tail) => [head, ...(tail as any)]),
      ) as any;
    }
  });
}
