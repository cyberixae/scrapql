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

export type Json = unknown;

export type Id = string;
export type Key = string;
export type Property = string;
export type Err = Json;

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

export type ExistenceQuery<Q extends Id = Id> = Q & {
  readonly ExistenceQuery: unique symbol;
};
export const existenceQuery = <I extends Id = Id>(id: I): ExistenceQuery<I> =>
  id as ExistenceQuery<I>;

export type TermsQuery<Q extends Json> = Q;
export type LiteralQuery<Q extends Json> = Q;
export type LeafQuery<Q extends Json> = Q;
export type KeysQuery<SQ extends Query<any> = Json, K extends Key = Key> = Dict<K, SQ>;
export type IdsQuery<SQ extends Query<any> = Json, I extends Id = Id> = Dict<I, SQ>;
export type SearchQuery<
  SQ extends Query<any> = Json,
  TQ extends TermsQuery<any> = Json
> = Dict<TQ, SQ>;
export type PropertiesQuery<
  Q extends { [I in Property]: Query<any> } = { [I in Property]: Json }
> = Partial<Q>;

export type FetchableQuery<Q extends LeafQuery<any> | ExistenceQuery<any>> = Q;
export type StructuralQuery<
  Q extends LiteralQuery<any> | KeysQuery | IdsQuery | PropertiesQuery
> = Q;

export type Query<Q extends StructuralQuery<any> | FetchableQuery<any>> = Q;

export type Existence = boolean;
export type ExistenceResult<E extends Err = Err> = Either<E, Existence>;
export type LiteralResult<Q extends Json> = Q;
export type LeafResult<Q extends Json> = Q;
export type KeysResult<SR extends Result<any> = Json, K extends Key = Key> = Dict<K, SR>;
export type IdsResult<
  SR extends Result<any> = Json,
  I extends Id = Id,
  E extends Err = Err
> = Dict<I, Either<E, Option<SR>>>;
export type SearchResult<
  SR extends Result<any> = Json,
  TQ extends TermsQuery<any> = Json,
  E extends Err = Err
> = Dict<TQ, Either<E, Option<SR>>>;
export type PropertiesResult<
  R extends { [I in Property]: Result<any> } = { [I in Property]: Json }
> = Partial<R>;

export type ReportableResult<R extends LeafResult<any> | ExistenceResult> = R;
export type StructuralResult<
  R extends LiteralResult<any> | KeysResult | IdsResult | PropertiesResult
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
  A extends Resolvers,
  C extends Context = Zero
> = Processor<Q, R, A, C>;

export type ResultProcessor<
  R extends Result<any>,
  A extends Reporters,
  C extends Context = Zero
> = Processor<R, void, A, C>;

export type Handler<I, O, C extends Context> = (i: I, c: C) => Task<O>;

export type API<T> = Record<string, T>;
export type Resolvers = API<any>; // should be API<Resolver>
export type Reporters = API<any>; // should be API<Reporter>

export type Reporter<R extends Result<any>, C extends Context> = Handler<R, void, C>;

export type ReporterConnector<
  A extends Reporters,
  R extends Result<any>,
  C extends Context
> = (a: A) => Reporter<R, C>;

export type ResultProcessorMapping<
  A extends Reporters,
  R extends PropertiesResult,
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
  A extends Resolvers,
  Q extends Query<any>,
  R extends Result<any>,
  C extends Context
> = (a: A) => Resolver<Q, R, C>;

export type QueryProcessorMapping<
  A extends Resolvers,
  Q extends PropertiesQuery,
  R extends PropertiesResult,
  C extends Context
> = {
  [I in keyof Q & keyof R]: QueryProcessor<Required<Q>[I], Required<R>[I], A, C>;
};

export type Results<R extends Result<any>> = NonEmptyArray<R>;
export type ResultReducer<R extends Result<any>> = (r: Results<R>) => R;
export type LeafResultCombiner<R extends Result<any>> = (w: R, r: R) => R;

export type ResultReducerMapping<R extends PropertiesResult> = {
  [I in keyof R]: ResultReducer<Required<R>[I]>;
};

export type Constructor<T, A extends Args> = (...args: A) => T;

export type QueryConstructorArgs = Args;
export type ResultConstructorArgs = Args;
export type ErrConstructorArgs = Args;

export type QueryConstructor<
  Q extends Query<any> = any, //Query,
  A extends QueryConstructorArgs = QueryConstructorArgs
> = Constructor<Q, A>;

export type ResultConstructor<
  R extends Result<any> = any, //Result,
  A extends ResultConstructorArgs = ResultConstructorArgs
> = Constructor<R, A>;

export type ErrConstructor<
  E extends Err = Err,
  A extends ErrConstructorArgs = ErrConstructorArgs
> = Constructor<E, A>;

export type QueryUtils<
  QC extends QueryConstructor,
  RC extends ResultConstructor,
  QA extends Resolvers
> = {
  Query: t.Type<ReturnType<QC>, Json>;
  query: QC;
  processQuery: QueryProcessor<ReturnType<QC>, ReturnType<RC>, QA>;
};

export type ResultUtils<RC extends ResultConstructor, RA extends Reporters> = {
  Result: t.Type<ReturnType<RC>, Json>;
  result: RC;
  processResult: ResultProcessor<ReturnType<RC>, RA>;
  reduceResult: ResultReducer<ReturnType<RC>>;
};

export type ErrUtils<EC extends ErrConstructor> = {
  Err: t.Type<ReturnType<EC>, Json>;
  err: EC;
};

export type Protocol<
  QC extends QueryConstructor,
  RC extends ResultConstructor,
  EC extends ErrConstructor,
  QA extends Resolvers,
  RA extends Reporters
> = QueryUtils<QC, RC, QA> & ResultUtils<RC, RA> & ErrUtils<EC>;
