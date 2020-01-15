export type Empty = Array<never>
export const empty: Empty = []

export type Prepend<N, C extends Prepend<any, any>> = Empty|[N, C]
export const prepend = <N>(n: N) => <C extends Empty|Prepend<any, any>>(c: C): Prepend<N, C> => [n, c]

export type Context<C extends Prepend<any, any> = any> = C;

export {}
