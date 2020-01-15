
export type Tuple<C, N extends Tuple<any, any, L>, L> = L|[C, N]
export const tuple = <C, N extends L|Tuple<any, any, L>, L>(c: C, n: N): Tuple<C, N, L> => [c, n]

export type Empty = Array<never>
export const empty: Empty = []

export type Open<C, L> = <N extends L|Tuple<any, any, L>>(n: N) => Tuple<C, N, L>
export const open = <C, L>(c: C): Open<C, L> => <N extends L|Tuple<any, any, L>>(n: N): Tuple<C, N, L> => tuple(c, n)

const foo: Open<'foo', Empty> = open<'foo', Empty>('foo');
const bar: Open<'bar', Empty> = open<'bar', Empty>('bar');
const lol: Open<'lol', Empty> = open<'lol', Empty>('lol');

export type Plus<A, B, L> = <N extends Tuple<any, any, L>>(n: N) => Tuple<A, Tuple<B, N, L>, L>
export const plus = <A, B, L>(a: Open<A, L>, b: Open<B, L>): Plus<A, B, L> => <N extends L|Tuple<Tuple<any, any, L>, any, L>>(n: N) => a(b(n))

const muumi1: Plus<'foo', 'bar', Empty> = (n) => foo(bar(n))
const muumi2: Plus<'foo', 'bar', Empty> = (n) => foo(bar(n))

export type Closed<C, N extends Empty|Closed<any, any>> = Tuple<C, N, Empty>
export const closed = <C, L>(t: Open<C, L>, l: L): Tuple<C, L, L> => t(l)

export {}
