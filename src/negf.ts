import { pipe } from 'fp-ts/lib/pipeable';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import * as NonEmptyArray_ from 'fp-ts/lib/NonEmptyArray';

export type NEGenFResult<A> = IteratorResult<A, A>;

export type NEGenF<A> = () => Generator<A, A, undefined>;
export function neGenF<A>(nea: NonEmptyArray<A>): NEGenF<A> {
  return function* () {
    // eslint-disable-next-line
    for (const a of NonEmptyArray_.init(nea)) {
      yield a;
    }
    return NonEmptyArray_.last(nea);
  };
}

export function toNEArray<A>(gen: NEGenF<A>): NonEmptyArray<A> {
  const handle = gen();
  const init = [];
  // eslint-disable-next-line
  let last;
  // eslint-disable-next-line
  while(true) {
    // eslint-disable-next-line
    let { done, value } = handle.next();
    if (done) {
      // eslint-disable-next-line
      last = value;
      break;
    } else {
      init.push(value);
    }
  }
  return NonEmptyArray_.snoc(init, last);
}

export function fromGF<A>(gf: () => Generator<A, void, undefined>): NEGenF<A> {
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

export function take(limit: number) {
  return function <A>(gen: NEGenF<A>): NEGenF<A> {
    return fromGF(function* () {
      // eslint-disable-next-line
      const handle = gen();
      // eslint-disable-next-line
      let i = 0;
      // eslint-disable-next-line
      while(i < limit) {
        // eslint-disable-next-line
        let { done, value } = handle.next();
        yield value;
        if (done) {
          break;
        }
        // eslint-disable-next-line
        i += 1;
      }
    });
  };
}

export function map<A, B>(f: (a: A) => B) {
  return function (gen: NEGenF<A>): NEGenF<B> {
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

export function sequenceT<I extends NonEmptyArray<NEGenF<any>>>(
  ...generators: I
): NEGenF<{ [K in keyof I]: I[K] extends NEGenF<infer A> ? A : never }> {
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

export function sequenceS<O extends Record<string, NEGenF<any>>>(
  generators: {
    [I in keyof O]: O[I];
  },
): NEGenF<{ [I in keyof O]: O[I] extends NEGenF<infer A> ? A : never }> {
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
