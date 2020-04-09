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
    if (more.length === 0) {
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
    }
    const tails = sequenceT(...(more as any));

    const handle = first();
    // eslint-disable-next-line
    while(true) {
      // eslint-disable-next-line
      let { done: doneHeads, value: head } = handle.next();
      // eslint-disable-next-line
      let combos = pipe(
        tails,
        map((tail) => [head, ...(tail as any)]),
      ) as any;
      const comboHandle = combos();
      // eslint-disable-next-line
      while (true) {
        const { done: doneCombos, value: combo } = comboHandle.next();
        yield combo as any;
        if (doneCombos) {
          break;
        }
      }
      if (doneHeads) {
        break;
      }
    }
  });
}

export function sequenceS<O extends Record<string, SIterator<any>>>(
  generators: {
    [I in keyof O]: O[I];
  },
): SIterator<{ [I in keyof O]: O[I] extends SIterator<infer A> ? A : never }> {
  return fromGF(function* () {
    const [[firstKey, firstGen], ...more] = Object.entries(generators);
    if (more.length === 0) {
      const handle = firstGen();
      // eslint-disable-next-line
      while(true) {
        // eslint-disable-next-line
        let { done, value: head } = handle.next();
        yield Object.fromEntries([[firstKey, head]]) as any;
        if (done) {
          return;
        }
      }
    }
    const tails: any = sequenceS(Object.fromEntries(more) as any);

    const handle = firstGen();
    // eslint-disable-next-line
    while(true) {
      // eslint-disable-next-line
      let { done: doneHeads, value: head } = handle.next();
      // eslint-disable-next-line
      let combos = pipe(
        tails,
        map((tail) =>
          Object.fromEntries([[firstKey, head], ...Object.entries(tail as any)]),
        ),
      ) as any;
      const comboHandle = combos();
      // eslint-disable-next-line
      while (true) {
        const { done: doneCombos, value: combo } = comboHandle.next();
        yield combo as any;
        if (doneCombos) {
          break;
        }
      }
      if (doneHeads) {
        break;
      }
    }
  }) as any;
}
