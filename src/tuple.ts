
export type Empty = Array<never>
export const empty: Empty = []

export type Tuple<C, N extends Tuple<any, any>> = Empty|[C, N]
export const tuple = <C, N extends Empty|Tuple<any, any>>(c: C, n: N): Tuple<C, N> => [c, n]
export const closed = <C>(t: Open<C>): Tuple<C, Empty> => t(empty)

export type Open<C> = <N extends Tuple<any, any>>(n: N) => Tuple<C, N>
export const open = <C>(c: C): Open<C> => <N extends Tuple<any, any>>(n: N): Tuple<C, N> => tuple(c, n)

export type Plus<A, B> = <N extends Tuple<any, any>>(n: N) => Tuple<A, Tuple<B, N>>
export const plus = <A, B>(a: Open<A>, b: Open<B>): Plus<A, B> => <N extends Tuple<Tuple<any, any>, any>>(n: N) => a(b(n))

const foo: Open<'foo'> = open('foo');
const bar: Open<'bar'> = open('bar');
const lol: Open<'lol'> = open('lol');

const omg1: Tuple<'foo', Tuple<'bar', Tuple<'lol', Empty>>> = foo(bar(lol(empty)))
const omg2: Tuple<'foo', Tuple<'bar', Tuple<'lol', Empty>>> = foo(plus(bar,lol)(empty))

const foobar: Plus<'foo', 'bar'> = plus(foo, bar)

export {}
