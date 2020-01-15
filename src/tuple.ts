
export type Tuple<C, N extends Tuple<any, any, L>, L> = L|[C, N]
export const tuple = <C, N extends L|Tuple<any, any, L>, L>(c: C, n: N): Tuple<C, N, L> => [c, n]

export type Empty = Array<never>
export const empty: Empty = []

export type Open<C, L> = <N extends L|Tuple<any, any, L>>(n: N) => Tuple<C, N, L>
export const open = <C, L>(c: C): Open<C, L> => <N extends L|Tuple<any, any, L>>(n: N): Tuple<C, N, L> => tuple(c, n)

const foo: Open<'foo', Empty> = open<'foo', Empty>('foo');
const bar: Open<'bar', Empty> = open<'bar', Empty>('bar');
const lol: Open<'lol', Empty> = open<'lol', Empty>('lol');


const muumi = <N extends Empty|Tuple<any, any, Empty>>(n: N) => foo(bar(n))

// type Plus = (a: Open<>, b: Open<>) => Open<>


export type Plus<A extends Open<AC, L>, B extends Open<BC, L>, AC, BC, L> = <N extends Tuple<any, any, L>>(n: N) => Tuple<AC, Tuple<BC, N, L>, L>
export const plus = <A extends Open<AC, L>, B extends Open<BC, L>, AC, BC, L>(a: A, b: B): Plus<A, B, AC, BC, L> => <N extends L|Tuple<Tuple<any, any, L>, any, L>>(n: N) => a(b(n))





/*
export type Open<C, L> = <N extends L|Tuple<any, any, L>>(n: N) => Open<N, L>
export const open = <C, N extends L|Tuple<any, any, L>, L>(c: C) => (n: N): Tuple<C, N, L> => tuple(c, n)
*/


export type Closed<C, N extends Empty|Closed<any, any>> = Tuple<C, N, Empty>
export const closed = (t: Open) =>

export {}
