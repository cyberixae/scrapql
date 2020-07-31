import * as t from 'io-ts';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { Option } from 'fp-ts/lib/Option';
import { Either } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as Option_ from 'fp-ts/lib/Option';

import { Zero, zero, Prepend, prepend, Onion } from './utils/onion';
import { Dict as _Dict, dict as _dict } from './utils/dict';
import { NEGenF, neGenF } from './utils/negf';

import * as abstr from './types/abstract';

export * as ids from './shapes/ids';
export * as keys from './shapes/keys';
export * as leaf from './shapes/leaf';
export * as literal from './shapes/literal';
export * as search from './shapes/search';
export * as properties from './shapes/properties';

export type Dict<K, V> = _Dict<K, V>;
export const Dict = _Dict;
export const dict = _dict;

export type Json = unknown;

export type Terms<T extends Json> = T;
export type Id<I extends string> = I;
export type Key<K extends string> = K;
export type Property<P extends string> = P;
export type Err<E extends Json> = E;
export type Existence = boolean;

export type Context = abstr.Context;

export type Ctx0 = Zero;
export const ctx0 = zero;

// TODO: replace Onion with TS4 tuple type

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

export type ExistenceQueryPayload<QP extends Id<string>> = QP;
export type TermsQueryPayload<QP extends Terms<any>> = QP;
export type LiteralQueryPayload<QP extends string> = QP;
export type LeafQueryPayload<QP extends Json> = QP;

export type QueryPayload<
  QP extends
    | ExistenceQueryPayload<any>
    | TermsQueryPayload<any>
    | LiteralQueryPayload<any>
    | LeafQueryPayload<any>
> = QP;

export type ExistenceQuery<QP extends ExistenceQueryPayload<any>> = { q: QP };
export type TermsQuery<QP extends TermsQueryPayload<any>> = { q: QP };
export type LiteralQuery<QP extends LiteralQueryPayload<string>> = { q: QP };
export type LeafQuery<QP extends LeafQueryPayload<any>> = { q: QP };

export type KeysQuery<Q extends Dict<Key<any>, Query<any>>> = Q;
export type IdsQuery<Q extends Dict<Id<any>, Query<any>>> = Q;
export type SearchQuery<Q extends Dict<TermsQueryPayload<any>, Query<any>>> = Q;
export type PropertiesQuery<
  Q extends {
    [I in Property<any>]: Query<any>;
  }
> = Partial<Q>;

export type Query<
  Q extends
    | ExistenceQuery<any>
    | TermsQuery<any>
    | LiteralQuery<any>
    | LeafQuery<any>
    | KeysQuery<any>
    | IdsQuery<any>
    | SearchQuery<any>
    | PropertiesQuery<any>
> = Q;

export type ExistenceResultPayload<RP extends Existence> = RP;
export type TermsResultPayload<RP extends Array<Id<any>>> = RP;
export type LiteralResultPayload<RP extends string> = RP;
export type LeafResultPayload<RP extends Json> = RP;

export type ResultPayload<
  RP extends
    | ExistenceResultPayload<any>
    | TermsResultPayload<any>
    | LiteralResultPayload<any>
    | LeafResultPayload<any>
> = RP;

export type ExistenceResult<
  QP extends ExistenceQueryPayload<any>,
  RP extends ExistenceResultPayload<any>
> = { q: QP; r: RP };
export type TermsResult<
  QP extends TermsQueryPayload<any>,
  RP extends TermsResultPayload<any>
> = { q: QP; r: RP };
export type LiteralResult<
  QP extends LiteralQueryPayload<string>,
  RP extends LiteralResultPayload<string>
> = { q: QP; r: RP };
export type LeafResult<
  QP extends LeafQueryPayload<any>,
  RP extends LeafResultPayload<any>
> = { q: QP; r: RP };

export type KeysResult<R extends Dict<Key<any>, Result<any>>> = R;
export type IdsResult<R extends Dict<Id<any>, Option<Result<any>>>> = R;
export type SearchResult<
  R extends Dict<TermsQueryPayload<any>, Dict<TermsResultPayload<any>, Result<any>>>
> = R;
export type PropertiesResult<
  R extends {
    [I in Property<any>]: Result<any>;
  }
> = Partial<R>;

export type Result<
  R extends
    | ExistenceResult<any, any>
    | TermsResult<any, any>
    | LiteralResult<any, any>
    | LeafResult<any, any>
    | KeysResult<any>
    | IdsResult<any>
    | SearchResult<any>
    | PropertiesResult<any>
> = R;

export type QueryProcessorInstance<
  Q extends Query<any>,
  R extends Result<any>,
  E extends Err<any>
> = abstr.ProcessorInstance<Q, Either<E, R>>;
export type ResultProcessorInstance<R extends Result<any>> = abstr.ProcessorInstance<
  R,
  void
>;

export type Reporter<
  QP extends QueryPayload<any>,
  RP extends ResultPayload<any>,
  C extends Context
> = abstr.Handler<RP, void, Prepend<QP, C>>;
export type Reporters<A extends abstr.API<{ [p: string]: Reporter<any, any, any> }>> = A;

export type Resolver<
  QP extends QueryPayload<any>,
  RP extends ResultPayload<any>,
  E extends Err<any>,
  C extends Context
> = abstr.Handler<QP, Either<E, RP>, C>;
export type Resolvers<
  A extends abstr.API<{ [p: string]: Resolver<any, any, any, any> }>
> = A;

export type QueryProcessor<
  Q extends Query<any>,
  R extends Result<any>,
  E extends Err<any>,
  C extends Context,
  A extends Resolvers<any>
> = abstr.Processor<Q, Either<E, R>, C, A>;

export type ResultProcessor<
  R extends Result<any>,
  C extends Context,
  A extends Reporters<any>
> = abstr.Processor<R, void, C, A>;

export type ReporterConnector<
  QP extends QueryPayload<any>,
  RP extends ResultPayload<any>,
  C extends Context,
  A extends Reporters<any>
> = (a: A) => A[keyof A] & Reporter<QP, RP, C>;

export type ExistenceReporterConnector<
  QP extends ExistenceQueryPayload<any>,
  RP extends ExistenceResultPayload<any>,
  C extends Context,
  A extends Reporters<any>
> = ReporterConnector<QP, RP, C, A>;

export type TermsReporterConnector<
  QP extends TermsQueryPayload<any>,
  RP extends TermsResultPayload<any>,
  C extends Context,
  A extends Reporters<any>
> = ReporterConnector<QP, RP, C, A>;

export type LiteralReporterConnector<
  QP extends LiteralQueryPayload<any>,
  RP extends LiteralResultPayload<any>,
  C extends Context,
  A extends Reporters<any>
> = ReporterConnector<QP, RP, C, A>;

export type LeafReporterConnector<
  QP extends LeafQueryPayload<any>,
  RP extends LeafResultPayload<any>,
  C extends Context,
  A extends Reporters<any>
> = ReporterConnector<QP, RP, C, A>;

export type ResultProcessorMapping<
  R extends PropertiesResult<any>,
  C extends Context,
  A extends Reporters<any>
> = {
  [I in keyof Required<R>]: ResultProcessor<Required<R>[I], C, A>;
};

export type ResolverConnector<
  QP extends QueryPayload<any>,
  RP extends ResultPayload<any>,
  E extends Err<any>,
  C extends Context,
  A extends Resolvers<any>
> = (a: A) => A[keyof A] & Resolver<QP, RP, E, C>;

export type ExistenceResolverConnector<
  QP extends ExistenceQueryPayload<any>,
  RP extends ExistenceResultPayload<any>,
  E extends Err<any>,
  C extends Context,
  A extends Resolvers<any>
> = ResolverConnector<QP, RP, E, C, A>;

export type TermsResolverConnector<
  QP extends TermsQueryPayload<any>,
  RP extends TermsResultPayload<any>,
  E extends Err<any>,
  C extends Context,
  A extends Resolvers<any>
> = ResolverConnector<QP, RP, E, C, A>;

export type LiteralResolverConnector<
  QP extends LiteralQueryPayload<any>,
  RP extends LiteralResultPayload<any>,
  E extends Err<any>,
  C extends Context,
  A extends Resolvers<any>
> = ResolverConnector<QP, RP, E, C, A>;

export type LeafResolverConnector<
  QP extends LeafQueryPayload<any>,
  RP extends LeafResultPayload<any>,
  E extends Err<any>,
  C extends Context,
  A extends Resolvers<any>
> = ResolverConnector<QP, RP, E, C, A>;

export type QueryProcessorMapping<
  Q extends PropertiesQuery<any>,
  R extends PropertiesResult<any>,
  E extends Err<any>,
  C extends Context,
  A extends Resolvers<any>
> = {
  [I in keyof Q & keyof R]: QueryProcessor<Required<Q>[I], Required<R>[I], E, C, A>;
};

type FailureDescription = string;

const STRUCTURE = 'Unexpected structure';
export type StructuralMismatch = {
  reason: typeof STRUCTURE;
  description: FailureDescription;
};
export const structuralMismatch = (
  description: FailureDescription,
): StructuralMismatch => ({
  reason: STRUCTURE,
  description,
});

const PAYLOAD = 'Unexpected payload';
export type PayloadMismatch = {
  reason: typeof PAYLOAD;
  description: FailureDescription;
};
export const payloadMismatch = (description: FailureDescription): PayloadMismatch => ({
  reason: PAYLOAD,
  description,
});

export type ReduceFailure = StructuralMismatch | PayloadMismatch;

export type ResultReducer<R extends Result<any>> = (
  r: NonEmptyArray<R>,
) => Either<ReduceFailure, R>;

export type Failure = ReduceFailure;

export type LeafResultCombiner<R extends LeafResult<any, any>> = (
  w: R,
  r: R,
) => Either<PayloadMismatch, R>;

export type ResultReducerMapping<R extends PropertiesResult<any>> = {
  [I in keyof R]: ResultReducer<Required<R>[I]>;
};

export type Constructor<T> = <I extends T>(i: I) => I;

export type Codec<T> = t.Type<T, Json>;

export type QueryCodec<Q extends Query<any>> = Codec<Q>;
export type ResultCodec<R extends Result<any>> = Codec<R>;
export type ErrCodec<E extends Err<any>> = Codec<E>;
export type KeyCodec<K extends Key<any>> = Codec<K>;
export type IdCodec<I extends Id<any>> = Codec<I>;
export type TermsCodec<T extends Terms<any>> = Codec<T>;

export type Codecs<Q extends Query<any>, R extends Result<any>, E extends Err<any>> = {
  Query: QueryCodec<Q>;
  Result: ResultCodec<R>;
  Err: ErrCodec<E>;
};

export type Constructors<
  Q extends Query<any>,
  R extends Result<any>,
  E extends Err<any>
> = {
  query: Constructor<Q>;
  result: Constructor<R>;
  err: Constructor<E>;
};
export const constructors = <
  Q extends Query<any>,
  R extends Result<any>,
  E extends Err<any>
>(
  _codecs: Codecs<Q, R, E>,
): Constructors<Q, R, E> => ({
  query: (q) => q,
  result: (r) => r,
  err: (e) => e,
});

export type Examples<A> = NEGenF<A>;
export const examples = neGenF;

export type QueryExamplesMapping<
  P extends Property<string>,
  Q extends PropertiesQuery<{ [I in P]: Query<any> }>
> = {
  [I in keyof Q]: Examples<Required<Q>[I]>;
};
export type ResultExamplesMapping<
  P extends Property<string>,
  R extends PropertiesResult<{ [I in P]: Result<any> }>
> = {
  [I in keyof R]: Examples<Required<R>[I]>;
};

export type ExampleCatalog<Q extends Query<any>, R extends Result<any>> = {
  queryExamples: Examples<Q>;
  resultExamples: Examples<R>;
};

export type QueryUtils<
  Q extends Query<any>,
  R extends Result<any>,
  E extends Err<any>,
  C extends Context,
  QA extends Resolvers<any>
> = {
  processQuery: QueryProcessor<Q, R, E, C, QA>;
};

export type ResultUtils<
  R extends Result<any>,
  C extends Context,
  RA extends Reporters<any>
> = {
  processResult: ResultProcessor<R, C, RA>;
  reduceResult: ResultReducer<R>;
};

export type Fundamentals<
  Q extends Query<any>,
  R extends Result<any>,
  E extends Err<any>,
  C extends Context,
  QA extends Resolvers<any>,
  RA extends Reporters<any>
> = QueryUtils<Q, R, E, C, QA> &
  ResultUtils<R, C, RA> &
  Codecs<Q, R, E> &
  ExampleCatalog<Q, R>;

export type Conveniences<
  Q extends Query<any>,
  R extends Result<any>,
  E extends Err<any>
> = Constructors<Q, R, E>;

export type Protocol<
  Q extends Query<any>,
  R extends Result<any>,
  E extends Err<any>,
  C extends Context,
  QA extends Resolvers<any>,
  RA extends Reporters<any>
> = Fundamentals<Q, R, E, C, QA, RA> & Conveniences<Q, R, E>;

export const protocol = <
  Q extends Query<any>,
  R extends Result<any>,
  E extends Err<any>,
  C extends Context,
  QA extends Resolvers<any>,
  RA extends Reporters<any>
>(
  fundamentals: Fundamentals<Q, R, E, C, QA, RA>,
): Protocol<Q, R, E, C, QA, RA> => ({
  ...fundamentals,
  ...constructors(fundamentals),
});

export const processorInstance = <I, O, C extends Context, A extends abstr.API<any>>(
  processor: abstr.Processor<I, O, C, A>,
  context: C,
  api: A,
): abstr.ProcessorInstance<I, O> => (input: I) => processor(input)(context)(api);

export type LiteralProtocolSeed<
  E extends Err<any>,
  QP extends LiteralQueryPayload<string>,
  RP extends LiteralResultPayload<string>
> = {
  Err: ErrCodec<E>;
  Query: QueryCodec<QP> & t.LiteralC<QP>;
  Result: ResultCodec<RP> & t.LiteralC<RP>;
};

export type LeafProtocolSeed<
  E extends Err<any>,
  C extends Context,
  QA extends Resolvers<any>,
  RA extends Reporters<any>,
  QP extends LeafQueryPayload<any>,
  RP extends LeafResultPayload<any>
> = {
  Err: ErrCodec<E>;
  Query: QueryCodec<QP>;
  Result: ResultCodec<RP>;
  queryConnector: ResolverConnector<QP, RP, E, C, QA>;
  resultConnector: ReporterConnector<QP, RP, C, RA>;
  queryCombiner: LeafResultCombiner<LeafResult<QP, RP>>;
  resultCombiner: LeafResultCombiner<LeafResult<QP, RP>>;
  queryExamplesArray: NonEmptyArray<QP>;
  resultExamplesArray: NonEmptyArray<RP>;
};
