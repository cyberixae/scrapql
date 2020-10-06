import * as scrapql from '../scrapql';

export type MergeObject<A extends scrapql.Object, B extends scrapql.Object> = {
  [I in Exclude<keyof A, keyof B>]: A[I];
} &
  B;
export const mergeObject = <A extends scrapql.Object, B extends scrapql.Object>(
  a: A,
  b: B,
): MergeObject<A, B> => ({ ...a, ...b });
