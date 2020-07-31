import * as Array_ from 'fp-ts/lib/Array';
import * as Either_ from 'fp-ts/lib/Either';
import * as TaskEither_ from 'fp-ts/lib/TaskEither';
import * as NonEmptyArray_ from 'fp-ts/lib/NonEmptyArray';
import { Either } from 'fp-ts/lib/Either';
import { ReaderTask } from 'fp-ts/lib/ReaderTask';
import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { pipe } from 'fp-ts/lib/pipeable';

import {
  Context,
  Err,
  Examples,
  LeafProtocolSeed,
  LeafQuery,
  LeafQueryPayload,
  LeafReporterConnector,
  LeafResolverConnector,
  LeafResult,
  LeafResultPayload,
  LeafResultCombiner,
  Protocol,
  QueryProcessor,
  PayloadMismatch,
  Reporters,
  Resolvers,
  ResultProcessor,
  ResultReducer,
  examples,
  protocol,
} from '../scrapql';

// leaf query contains information for retrieving a payload

export function processQuery<
  Q extends LeafQuery<QP>,
  E extends Err<any>,
  C extends Context,
  A extends Resolvers<any>,
  QP extends LeafQueryPayload<any>,
  RP extends LeafResultPayload<any>
>(
  connect: LeafResolverConnector<QP, RP, E, C, A>,
): QueryProcessor<Q, LeafResult<QP, RP>, E, C, A> {
  return ({ q }: Q) => (context: C): ReaderTaskEither<A, E, LeafResult<QP, RP>> => {
    return (resolvers) => {
      const resolver = connect(resolvers);
      return pipe(
        resolver(q, context),
        TaskEither_.map((r) => ({ q, r })),
      );
    };
  };
}

// leaf result contains part of the payload

export function processResult<
  R extends LeafResult<QP, RP>,
  C extends Context,
  A extends Reporters<any>,
  QP extends LeafQueryPayload<any>,
  RP extends LeafResultPayload<any>
>(connect: LeafReporterConnector<QP, RP, C, A>): ResultProcessor<R, C, A> {
  return ({ q, r }: R) => (context: C): ReaderTask<A, void> => {
    return (reporters) => {
      const reporter = connect(reporters);
      return reporter(q, r, context);
    };
  };
}

export const reduceResult = <R extends LeafResult<any, any>>(
  combineLeafResult: LeafResultCombiner<R>,
): ResultReducer<R> => (results) => {
  const writeResult: R = NonEmptyArray_.head(results);
  const readResult: Array<R> = NonEmptyArray_.tail(results);
  const result: Either<PayloadMismatch, R> = pipe(
    readResult,
    Array_.reduce(Either_.right(writeResult), (ew, r) =>
      pipe(
        ew,
        Either_.chain((w) => combineLeafResult(w, r)),
      ),
    ),
  );
  return result;
};

export function queryExamples<Q extends LeafQuery<any>>(
  queries: NonEmptyArray<Q>,
): Examples<Q> {
  return examples(queries);
}

export function resultExamples<R extends LeafResult<any, any>>(
  results: NonEmptyArray<R>,
): Examples<R> {
  return examples(results);
}

export const bundle = <
  E extends Err<any>,
  C extends Context,
  QA extends Resolvers<any>,
  RA extends Reporters<any>,
  QP extends LeafQueryPayload<any>,
  RP extends LeafResultPayload<any>
>(
  seed: LeafProtocolSeed<E, C, QA, RA, QP, RP>,
): Protocol<LeafQuery<QP>, LeafResult<QP, RP>, E, C, QA, RA> =>
  protocol({
    Query: seed.Query,
    Result: seed.Result,
    Err: seed.Err,
    processQuery: processQuery(seed.queryConnector),
    processResult: processResult(seed.resultConnector),
    reduceResult: reduceResult(seed.resultCombiner),
    queryExamples: queryExamples(seed.queryExamplesArray),
    resultExamples: resultExamples(seed.resultExamplesArray),
  });
