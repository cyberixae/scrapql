import * as t from 'io-ts';
import { Concat, Reverse } from 'typescript-tuple';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { Option } from 'fp-ts/lib/Option';
import { Either } from 'fp-ts/lib/Either';
import { Task } from 'fp-ts/lib/Task';
import { ReaderTask } from 'fp-ts/lib/ReaderTask';

import { Tuple, reverse } from './tuple';
export { process } from './process';
export { reduce } from './reduce';

export type Json = unknown;

export type Id = string;
export type Key = string;
export type Property = string;
export type Err = Json;

export type ExistenceQuery<Q extends Id = Id> = Q & {
  readonly ExistenceQuery: unique symbol;
};
export const existenceQuery = <I extends Id = Id>(id: I): ExistenceQuery<I> =>
  id as ExistenceQuery<I>;

export type LiteralQuery = Json;
export type LeafQuery = Json;
export type KeysQuery<SQ extends Query = Json, K extends Key = Key> = Record<K, SQ>;
export type IdsQuery<SQ extends Query = Json, I extends Id = Id> = Record<I, SQ>;
export type PropertiesQuery<
  Q extends { [I in Property]: Query } = { [I in Property]: Json }
> = Partial<Q>;

export type FetchableQuery = LeafQuery | ExistenceQuery<any>;
export type StructuralQuery = LiteralQuery | KeysQuery | IdsQuery | PropertiesQuery;

export type Query = StructuralQuery | FetchableQuery;

export type Existence = boolean;
export type ExistenceResult<E extends Err = Err> = Either<E, Existence>;
export type LiteralResult = Json;
export type LeafResult = Json;
export type KeysResult<SR extends Result = Json, K extends Key = Key> = Record<K, SR>;
export type IdsResult<
  SR extends Result = Json,
  I extends Id = Id,
  E extends Err = Err
> = Record<I, Either<E, Option<SR>>>;
export type PropertiesResult<
  R extends { [I in Property]: Result } = { [I in Property]: Json }
> = Partial<R>;

export type ReportableResult = LeafResult | ExistenceResult;
export type StructuralResult = LiteralResult | KeysResult | IdsResult | PropertiesResult;

export type Result = StructuralResult | ReportableResult;

export type Context = Tuple<string>;

export type ProcessorInstance<I, O> = (i: I) => Task<O>;
export const processorInstance = <I, O, A extends API<any>, C extends Context>(
  processor: Processor<I, O, A, Reverse<C>>,
  api: A,
  ...rest: C
): ProcessorInstance<I, O> => (input: I) => processor(input)(reverse(rest))(api);

export type QueryProcessorInstance<Q extends Query, R extends Result> = ProcessorInstance<
  Q,
  R
>;
export type ResultProcessorInstance<R extends Result> = ProcessorInstance<R, void>;

export type Processor<I, O, A extends API<any>, C extends Context> = (
  i: I,
) => (c: C) => ReaderTask<A, O>;

export type QueryProcessor<
  Q extends Query,
  R extends Result,
  A extends Resolvers,
  C extends Context = []
> = Processor<Q, R, A, C>;

export type ResultProcessor<
  R extends Result,
  A extends Reporters,
  C extends Context = []
> = Processor<R, void, A, C>;

export type Handler<A extends Tuple, R> = (...a: A) => Task<R>;

export type API<T> = Record<string, T>;
export type Resolvers = API<any>; // should be API<Resolver>
export type Reporters = API<any>; // should be API<Reporter>

export type Reporter<R extends Result, C extends Context> = Handler<
  Concat<Reverse<C>, [R]>,
  void
>;

export type ReporterConnector<
  A extends Reporters,
  R extends Result,
  C extends Context
> = (a: A) => Reporter<R, C>;

export type ResultProcessorMapping<
  A extends Reporters,
  R extends PropertiesResult,
  C extends Context
> = {
  [I in keyof Required<R>]: ResultProcessor<Required<R>[I], A, C>;
};

export type Resolver<Q extends Query, R extends Result, C extends Context> = Handler<
  Concat<Reverse<C>, [Q]>,
  R
>;

export type ResolverConnector<
  A extends Resolvers,
  Q extends Query,
  R extends Result,
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

export type Results<R extends Result> = NonEmptyArray<R>;
export type ResultReducer<R extends Result> = (r: Results<R>) => R;
export type LeafResultCombiner<R extends Result> = (w: R, r: R) => R;

export type ResultReducerMapping<R extends PropertiesResult> = {
  [I in keyof R]: ResultReducer<Required<R>[I]>;
};

export type Constructor<T, A extends Tuple = Tuple> = (...args: A) => T;

export type QueryConstructorArgs = Tuple;
export type ResultConstructorArgs = Tuple;
export type ErrConstructorArgs = Tuple;

export type QueryConstructor<
  Q extends Query = any, //Query,
  A extends QueryConstructorArgs = QueryConstructorArgs
> = Constructor<Q, A>;

export type ResultConstructor<
  R extends Result = any, //Result,
  A extends ResultConstructorArgs = ResultConstructorArgs
> = Constructor<R, A>;

export type ErrConstructor<
  E extends Err = Err,
  A extends ErrConstructorArgs = ErrConstructorArgs
> = Constructor<E, A>;

export type QueryUtils<
  QA extends QueryConstructorArgs,
  Q extends Query,
  R extends Result,
  QR extends Resolvers
> = {
  Query: t.Type<Q>;
  query: QueryConstructor<Q, QA>;
  processQuery: QueryProcessor<Q, R, QR>;
};

export type ResultUtils<
  RA extends ResultConstructorArgs,
  R extends Result,
  RR extends Reporters
> = {
  Result: t.Type<R>;
  result: ResultConstructor<R, RA>;
  processResult: ResultProcessor<R, RR>;
  reduceResult: ResultReducer<R>;
};

export type ErrUtils<EA extends ErrConstructorArgs, E extends Err> = {
  Err: t.Type<E>;
  err: ErrConstructor<E, EA>;
};

export type Protocol<
  QA extends QueryConstructorArgs,
  Q extends Query,
  RA extends ResultConstructorArgs,
  R extends Result,
  EA extends ErrConstructorArgs,
  E extends Err,
  QR extends Resolvers,
  RR extends Reporters
> = QueryUtils<QA, Q, R, QR> & ResultUtils<RA, R, RR> & ErrUtils<EA, E>;
