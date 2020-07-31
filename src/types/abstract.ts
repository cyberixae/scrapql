import { Task } from 'fp-ts/lib/Task';
import { ReaderTask } from 'fp-ts/lib/ReaderTask';
import { Onion, Zero } from './utils/onion';

export type Handler<I extends [any] | [any, any], O, C extends Context> = I extends [
  infer Q,
  infer R,
]
  ? (q: Q, r: R, c: C) => Task<O>
  : I extends [infer Q]
  ? (q: Q, c: C) => Task<O>
  : never;

export type API<A extends { [p: string]: Handler<any, any, any> }> = A;

export type Processor<I, O, C extends Context, A extends API<any>> = (
  i: I,
) => (c: C) => ReaderTask<A, O>;

export type ProcessorInstance<I, O> = (i: I) => Task<O>;

// TODO: with TS4 tuple type Context<C extends Array<any>> = C
export type Context = Onion<any, any> | Zero;
