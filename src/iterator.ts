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
      yield previous.value;
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
      console.log('muumi1.5');

      const handle = first();
      // eslint-disable-next-line
      while(true) {
        // eslint-disable-next-line
        let { done, value: head } = handle.next();
        yield [head] as any;
        if (done) {
          return;
        }
      }
      console.log('/muumi1.5');
    }
    const tails = sequenceT(...(more as any));

    const handle = first();
    // eslint-disable-next-line
    while(true) {
      // eslint-disable-next-line
      let { done: doneH, value: head } = handle.next();
      // eslint-disable-next-line
      let grog = pipe(
        tails,
        map((tail) => [head, ...(tail as any)]),
      ) as any;
      console.log('buumi')
      let woot = grog();
      while(true) {
        let { done: doneT, value } = woot.next();
        yield value as any;
        if (doneT) {
          break;
        }
      }
      if (doneH) {
        break;
      }
    }
    console.log('muumi3');
  });
}
