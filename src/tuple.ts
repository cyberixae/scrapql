
import { pipe } from 'fp-ts/lib/pipeable';

export type Empty = Array<never>
export const empty: Empty = []

export type Prepend<N, C extends Prepend<any, any>> = Empty|[C, N]
export const prepend = <N>(n: N) => <C extends Empty|Prepend<any, any>>(c: C): Prepend<N, C> => [c, n]

const omg: Prepend<null, Prepend<123, Prepend<'foo',Empty>>> = pipe(
  empty,
  prepend('foo' as 'foo'),
  prepend(123 as 123),
  prepend(null),
);

export {}
