import * as Array_ from 'fp-ts/lib/Array';
import * as Either_ from 'fp-ts/lib/Either';
import * as NonEmptyArray_ from 'fp-ts/lib/NonEmptyArray';
import * as TaskEither_ from 'fp-ts/lib/TaskEither';
import { Either } from 'fp-ts/lib/Either';
import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { pipe } from 'fp-ts/lib/pipeable';

import {
  Context,
  Err,
  Examples,
  LiteralProtocolSeed,
  LiteralQuery,
  LiteralResult,
  Protocol,
  QueryProcessor,
  ReduceFailure,
  Reporters,
  Resolvers,
  ResultProcessor,
  examples,
  protocol,
  reduceeMismatch,
} from '../scrapql';

// literal query contains static information that can be replaced with another literal

export function processQuery<
  A extends Resolvers,
  Q extends LiteralQuery,
  R extends LiteralResult,
  E extends Err,
  C extends Context
>(constant: R): QueryProcessor<Q, R, E, A, C> {
  return (_query: Q) => (_context: C): ReaderTaskEither<A, E, R> => {
    return (_resolvers) => TaskEither_.right(constant);
  };
}

// literal result is known on forehand so we throw it away

export function processResult<
  A extends Reporters,
  R extends LiteralResult,
  C extends Context
>(): ResultProcessor<R, A, C> {
  return (_result: R) => (_context: C): ReaderTaskEither<A, never, void> => {
    return (_reporters) => TaskEither_.right(undefined);
  };
}

export const reduceResult = <L extends LiteralResult>(
  results: NonEmptyArray<L>,
): Either<ReduceFailure, L> =>
  pipe(
    NonEmptyArray_.tail(results),
    Array_.reduce(
      Either_.right(NonEmptyArray_.head(results)),
      (ma: Either<ReduceFailure, L>, b: L): Either<ReduceFailure, L> =>
        pipe(
          ma,
          Either_.chain((a) => {
            if (JSON.stringify(a) !== JSON.stringify(b)) {
              return Either_.left(reduceeMismatch);
            }
            return Either_.right(a);
          }),
        ),
    ),
  );

export function queryExamples<Q extends LiteralQuery>(
  queries: NonEmptyArray<Q>,
): Examples<Q> {
  return examples(queries);
}

export function resultExamples<R extends LiteralResult>(
  results: NonEmptyArray<R>,
): Examples<R> {
  return examples(results);
}

export const bundle = <
  Q extends LiteralQuery,
  R extends LiteralResult,
  E extends Err,
  C extends Context,
  QA extends Resolvers,
  RA extends Reporters
>(
  seed: LiteralProtocolSeed<Q, R, E>,
): Protocol<Q, R, E, C, QA, RA> =>
  protocol({
    Query: seed.Query,
    Result: seed.Result,
    Err: seed.Err,
    processQuery: processQuery(seed.result),
    processResult: processResult(),
    reduceResult,
    queryExamples: queryExamples(seed.queryExamplesArray),
    resultExamples: resultExamples(seed.resultExamplesArray),
  });
