import * as t from 'io-ts';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { Option } from 'fp-ts/lib/Option';
import { Either } from 'fp-ts/lib/Either';
import { Task } from 'fp-ts/lib/Task';
import { ReaderTask } from 'fp-ts/lib/ReaderTask';
import { pipe } from 'fp-ts/lib/pipeable';
import * as Option_ from 'fp-ts/lib/Option';

import { Zero, zero, Prepend, prepend, Onion } from './onion';
import { Dict } from './dict';

export { process } from './process';
export { reduce } from './reduce';

export type Json = string | number | boolean | null | { [p: string]: Json } | Array<Json>;

export type Property = string;

export type Id<I extends string> = I;
export type Key<K extends string> = K;
export type Err<E extends Json> = E;

export type Args<T extends any = any> = Array<T>;

export type Ctx0 = Zero;
export const ctx0 = zero;

export type Ctx<N, C extends Onion<any, any> = Zero> = Prepend<N, C>;
export function ctx<N, A = never, B extends Onion<any, any> = Zero>(
  n: N,
): Prepend<N, Zero>;
export function ctx<N, A = never, B extends Onion<any, any> = Zero>(
  n: N,
  c: Zero,
): Prepend<N, Zero>;
export function ctx<N, A = never, B extends Onion<any, any> = Zero>(
  n: N,
  c: Prepend<A, B>,
): Prepend<N, Prepend<A, B>>;
export function ctx<N, A = never, B extends Onion<any, any> = Zero>(
  n: N,
  c?: Onion<A, B>,
): Prepend<N, Onion<A, B>> {
  return pipe(
    Option_.fromNullable(c),
    Option_.fold(
      () => prepend(n)(ctx0),
      (old: Onion<A, B>): Prepend<N, Onion<A, B>> => prepend(n)(old),
    ),
  );
}

export type Context = Ctx<any, any> | Ctx0;

export type ExistenceQuery<Q extends Id<any>> = Q & {
  readonly ExistenceQuery: unique symbol;
};
export const existenceQuery = <I extends Id<any>>(id: I): ExistenceQuery<I> =>
  id as ExistenceQuery<I>;

export type Terms<Q extends Json> = Q;
export type LiteralQuery<Q extends Json> = Q;
export type LeafQuery<Q extends Json> = Q;
export type KeysQuery<SQ extends Query<any>, K extends Key<any>> = Dict<K, SQ>;
export type IdsQuery<SQ extends Query<any>, I extends Id<any>> = Dict<I, SQ>;
export type SearchQuery<SQ extends Query<any>, T extends Terms<any>> = Dict<T, SQ>;
export type PropertiesQuery<Q extends { [I in Property]: Query<any> }> = Partial<Q>;

export type FetchableQuery<Q extends LeafQuery<any> | ExistenceQuery<any>> = Q;
export type StructuralQuery<
  Q extends
    | LiteralQuery<any>
    | KeysQuery<any, any>
    | IdsQuery<any, any>
    | PropertiesQuery<any>
> = Q;

export type Query<Q extends StructuralQuery<any> | FetchableQuery<any>> = Q;

export type Existence = boolean;
export type ExistenceResult<E extends Err<any>> = Either<E, Existence>;
export type LiteralResult<Q extends Json> = Q;
export type LeafResult<Q extends Json> = Q;
export type KeysResult<SR extends Result<any>, K extends Key<any>> = Dict<K, SR>;
export type IdsResult<
  SR extends Result<any>,
  I extends Id<any>,
  E extends Err<any>
> = Dict<I, Either<E, Option<SR>>>;
export type SearchResult<
  SR extends Result<any>,
  T extends Terms<any>,
  I extends Id<any>,
  E extends Err<any>
> = Dict<T, Either<E, Dict<I, SR>>>;
export type PropertiesResult<R extends { [I in Property]: Result<any> }> = Partial<R>;

export type ReportableResult<R extends LeafResult<any> | ExistenceResult<any>> = R;
export type StructuralResult<
  R extends
    | LiteralResult<any>
    | KeysResult<any, any>
    | IdsResult<any, any, any>
    | PropertiesResult<any>
> = R;

export type Result<R extends StructuralResult<any> | ReportableResult<any>> = R;

export type ProcessorInstance<I, O> = (i: I) => Task<O>;
export const processorInstance = <I, O, A extends API<any>, C extends Context>(
  processor: Processor<I, O, A, C>,
  api: A,
  context: C,
): ProcessorInstance<I, O> => (input: I) => processor(input)(context)(api);

export type QueryProcessorInstance<
  Q extends Query<any>,
  R extends Result<any>
> = ProcessorInstance<Q, R>;
export type ResultProcessorInstance<R extends Result<any>> = ProcessorInstance<R, void>;

export type Processor<I, O, A extends API<any>, C extends Context> = (
  i: I,
) => (c: C) => ReaderTask<A, O>;

export type QueryProcessor<
  Q extends Query<any>,
  R extends Result<any>,
  A extends Resolvers<any>,
  C extends Context = Zero
> = Processor<Q, R, A, C>;

export type ResultProcessor<
  R extends Result<any>,
  A extends Reporters<any>,
  C extends Context = Zero
> = Processor<R, void, A, C>;

export type Handler<I, O, C extends Context> = (i: I, c: C) => Task<O>;

export type API<T> = Record<string, T>;
export type Resolvers<A extends API<Resolver<any, any, any>>> = A;
export type Reporters<A extends API<Reporter<any, any>>> = A;

export type Reporter<R extends Result<any>, C extends Context> = Handler<R, void, C>;

export type ReporterConnector<
  A extends Reporters<any>,
  R extends Result<any>,
  C extends Context
> = (a: A) => Reporter<R, C>;

export type ResultProcessorMapping<
  A extends Reporters<any>,
  R extends PropertiesResult<any>,
  C extends Context
> = {
  [I in keyof Required<R>]: ResultProcessor<Required<R>[I], A, C>;
};

export type Resolver<
  Q extends Query<any>,
  R extends Result<any>,
  C extends Context
> = Handler<Q, R, C>;

export type ResolverConnector<
  A extends Resolvers<any>,
  Q extends Query<any>,
  R extends Result<any>,
  C extends Context
> = (a: A) => Resolver<Q, R, C>;

export type QueryProcessorMapping<
  A extends Resolvers<any>,
  Q extends PropertiesQuery<any>,
  R extends PropertiesResult<any>,
  C extends Context
> = {
  [I in keyof Q & keyof R]: QueryProcessor<Required<Q>[I], Required<R>[I], A, C>;
};

export type Results<R extends Result<any>> = NonEmptyArray<R>;
export type ResultReducer<R extends Result<any>> = (r: Results<R>) => R;
export type LeafResultCombiner<R extends Result<any>> = (w: R, r: R) => R;

export type ResultReducerMapping<R extends PropertiesResult<any>> = {
  [I in keyof R]: ResultReducer<Required<R>[I]>;
};

export type Constructor<T, A extends Args> = (...args: A) => T;

export type QueryConstructorArgs = Args;
export type ResultConstructorArgs = Args;
export type ErrConstructorArgs = Args;

export type QueryConstructor<
  Q extends Query<any>,
  A extends QueryConstructorArgs
> = Constructor<Q, A>;

export type ResultConstructor<
  R extends Result<any>,
  A extends ResultConstructorArgs
> = Constructor<R, A>;

export type ErrConstructor<
  E extends Err<any>,
  A extends ErrConstructorArgs
> = Constructor<E, A>;

export type QueryUtils<
  QC extends QueryConstructor<any, any>,
  RC extends ResultConstructor<any, any>,
  QA extends Resolvers<any>
> = {
  Query: t.Type<ReturnType<QC>, unknown>;
  query: QC;
  processQuery: QueryProcessor<ReturnType<QC>, ReturnType<RC>, QA>;
};

export type ResultUtils<
  RC extends ResultConstructor<any, any>,
  RA extends Reporters<any>
> = {
  Result: t.Type<ReturnType<RC>, unknown>;
  result: RC;
  processResult: ResultProcessor<ReturnType<RC>, RA>;
  reduceResult: ResultReducer<ReturnType<RC>>;
};

export type ErrUtils<EC extends ErrConstructor<any, any>> = {
  Err: t.Type<ReturnType<EC>, unknown>;
  err: EC;
};

export type Protocol<
  QC extends QueryConstructor<any, any>,
  RC extends ResultConstructor<any, any>,
  EC extends ErrConstructor<any, any>,
  QA extends Resolvers<any>,
  RA extends Reporters<any>
> = QueryUtils<QC, RC, QA> & ResultUtils<RC, RA> & ErrUtils<EC>;
