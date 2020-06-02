import * as t from 'io-ts';
import * as Array_ from 'fp-ts/lib/Array';
import * as Foldable_ from 'fp-ts/lib/Foldable';
import * as NonEmptyArray_ from 'fp-ts/lib/NonEmptyArray';
import * as Record_ from 'fp-ts/lib/Record';
import * as Option_ from 'fp-ts/lib/Option';
import { Either, either } from 'fp-ts/lib/Either';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import { ReaderTask } from 'fp-ts/lib/ReaderTask';
import { ReaderTaskEither } from 'fp-ts/lib/ReaderTaskEither';
import { Task, taskSeq } from 'fp-ts/lib/Task';
import { TaskEither, taskEither } from 'fp-ts/lib/TaskEither';
import { array } from 'fp-ts/lib/Array';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import * as NEGenF_ from '../negf';

import {
  Context,
  Err,
  ErrCodec,
  Examples,
  PropertiesQuery,
  PropertiesResult,
  Property,
  Protocol,
  QueryExamplesMapping,
  QueryProcessor,
  QueryProcessorMapping,
  ReduceFailure,
  Reporters,
  Resolvers,
  ResultExamplesMapping,
  ResultProcessor,
  ResultProcessorMapping,
  ResultReducer,
  ResultReducerMapping,
  protocol,
} from '../scrapql';

// properties query contains optional queries that may or may not be present

export function processQuery<
  A extends Resolvers,
  Q extends PropertiesQuery,
  R extends PropertiesResult,
  E extends Err,
  C extends Context
>(processors: QueryProcessorMapping<A, Q, R, E, C>): QueryProcessor<Q, R, E, A, C> {
  return <P extends Property & keyof Q & keyof R>(query: Q) => (
    context: C,
  ): ReaderTaskEither<A, E, R> => {
    return (resolvers) => {
      const tasks: Record<P, TaskEither<E, R[P]>> = pipe(
        query,
        Record_.mapWithIndex((property, subQuery: Q[P]) => {
          const processor = processors[property];
          const subResult = processor(subQuery)(context)(resolvers);
          return subResult;
        }),
      );
      const result: TaskEither<E, Record<P, R[P]>> = Record_.sequence(taskEither)(tasks);

      return result as TaskEither<E, R>;
    };
  };
}

// properties result contains results for a set of optional queries

export function processResult<
  A extends Reporters,
  R extends PropertiesResult,
  C extends Context
>(processors: ResultProcessorMapping<A, R, C>): ResultProcessor<R, A, C> {
  return <P extends Property & keyof R>(result: R) => (
    context: C,
  ): ReaderTask<A, void> => {
    return (reporters): Task<void> => {
      const taskRecord: Record<P, Task<void>> = pipe(
        result,
        Record_.mapWithIndex((property, subResult: R[P]) => {
          const processor = processors[property];
          return processor(subResult)(context)(reporters);
        }),
      );
      const tasks: Array<Task<void>> = pipe(
        taskRecord,
        Record_.toUnfoldable(array),
        Array_.map(([_k, v]) => v),
      );
      return Foldable_.traverse_(taskSeq, array)(tasks, identity);
    };
  };
}

export const reduceResult = <R extends PropertiesResult>(
  processors: ResultReducerMapping<R>,
) => <P extends Property & keyof R>(
  results: NonEmptyArray<R>,
): Either<ReduceFailure, R> => {
  const omg: Record<P, Either<ReduceFailure, R[P]>> = pipe(
    NonEmptyArray_.head(results),
    Record_.mapWithIndex<P, unknown, Either<ReduceFailure, R[P]>>(
      (propName: P): Either<ReduceFailure, R[P]> => {
        const propReducer: ResultReducer<R[P]> = processors[propName];
        return pipe(
          results,
          NonEmptyArray_.map((r: R): R[P] => r[propName]),
          propReducer,
          (x: Either<ReduceFailure, R[P]>) => x,
        );
      },
    ),
  ) as Record<P, Either<ReduceFailure, R[P]>>;
  const result: Either<ReduceFailure, Record<P, R[P]>> = Record_.sequence(either)(omg);
  return result as Either<ReduceFailure, R>;
};

export function queryExamples<Q extends PropertiesQuery>(
  subQueries: QueryExamplesMapping<Q>,
): Examples<Q> {
  return NEGenF_.sequenceS(subQueries) as Examples<Q>;
}

export function resultExamples<R extends PropertiesResult>(
  subResults: ResultExamplesMapping<R>,
): Examples<R> {
  return NEGenF_.sequenceS(subResults) as Examples<R>;
}

export const bundle = <O extends Record<string, Protocol<any, any, any, any, any, any>>>(
  subProtocols: O,
): Protocol<
  PropertiesQuery<
    {
      [P in keyof O]: O[P] extends Protocol<infer Q, any, any, any, any, any> ? Q : never;
    }
  >,
  PropertiesResult<
    {
      [P in keyof O]: O[P] extends Protocol<any, infer R, any, any, any, any> ? R : never;
    }
  >,
  O extends Record<any, Protocol<any, any, infer E, any, any, any>> ? E : never,
  O extends Record<any, Protocol<any, any, any, infer C, any, any>> ? C : never,
  O extends Record<any, Protocol<any, any, any, any, infer QA, any>> ? QA : never,
  O extends Record<any, Protocol<any, any, any, any, any, infer RA>> ? RA : never
> =>
  protocol({
    Query: t.partial(
      pipe(
        subProtocols,
        Record_.map((subProtocol: any) => subProtocol.Query) as any,
        (x) => x as { [I in keyof O]: O[I]['Query'] },
      ),
    ),
    Result: t.partial(
      pipe(
        subProtocols,
        Record_.map((subProtocol: any) => subProtocol.Result),
        (x) => x as { [I in keyof O]: O[I]['Result'] },
      ),
    ),
    Err: pipe(
      subProtocols,
      Record_.map((subProtocol: any) => subProtocol.Err),
      (x) => x as { [I in keyof O]: O[I]['Err'] },
      Record_.toArray,
      Array_.map(([_k, v]) => v),
      NonEmptyArray_.fromArray,
      Option_.fold(
        (): ErrCodec<any> => t.unknown,
        ([Err]) => Err,
      ),
    ),
    processQuery: processQuery(
      pipe(
        subProtocols,
        Record_.map((subProtocol: any) => subProtocol.processQuery),
        (x) => x as { [I in keyof O]: O[I]['processQuery'] },
      ),
    ),
    processResult: processResult(
      pipe(
        subProtocols,
        Record_.map((subProtocol: any) => subProtocol.processResult),
        (x) => x as any,
      ),
    ),
    reduceResult: reduceResult(
      pipe(
        subProtocols,
        Record_.map((subProtocol: any) => subProtocol.reduceResult),
        (x) => x as any,
      ),
    ),
    queryExamples: queryExamples(
      pipe(
        subProtocols,
        Record_.map((subProtocol: any) => subProtocol.queryExamples),
        (x) => x as { [I in keyof O]: O[I]['queryExamples'] },
      ),
    ),
    resultExamples: resultExamples(
      pipe(
        subProtocols,
        Record_.map((subProtocol: any) => subProtocol.resultExamples),
        (x) => x as { [I in keyof O]: O[I]['resultExamples'] },
      ),
    ),
  } as any);
