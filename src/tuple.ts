import { Prepend, Reverse } from 'typescript-tuple';

import { Context } from './types';

/* eslint-disable fp/no-mutating-methods */

export const prepend = <X>(x: X) => <C extends Context>(ctx: C): Prepend<C, X> =>
  [x, ...ctx] as Prepend<C, X>;

export const reverse = <C extends Context>(ctx: C): Reverse<C> =>
  ctx.reverse() as Reverse<C>;
