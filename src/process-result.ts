import { array } from 'fp-ts/lib/Array';
import * as Array_ from 'fp-ts/lib/Array';
import * as Foldable_ from 'fp-ts/lib/Foldable';
import * as Record_ from 'fp-ts/lib/Record';
import { Task, taskSeq } from 'fp-ts/lib/Task';
import { ReaderTask } from 'fp-ts/lib/ReaderTask';
import * as Task_ from 'fp-ts/lib/Task';
import { Option } from 'fp-ts/lib/Option';
import * as Option_ from 'fp-ts/lib/Option';
import { Either } from 'fp-ts/lib/Either';
import * as Either_ from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';

import { Dict } from './dict';
import * as Dict_ from './dict';
import { Prepend } from './onion';
import * as Onion_ from './onion';

import {
  ResultProcessor,
  Result,
  Context,
  ReporterConnector,
  Reporters,
  ResultProcessorMapping,
  LiteralResult,
  LeafResult,
  Key,
  KeysResult,
  Id,
  ExistenceResult,
  IdsResult,
  Terms,
  SearchResult,
  Property,
  PropertiesResult,
  Existence,
  Err,
} from './scrapql';

// literal result is known on forehand so we throw it away

export function literal<
  A extends Reporters,
  R extends LiteralResult,
  C extends Context
>(): ResultProcessor<R, A, C> {
  return (_result: R) => (_context: C): ReaderTask<A, void> => {
    return (_reporters) => Task_.of(undefined);
  };
}

// leaf result contains part of the payload

export function leaf<
  A extends Reporters,
  R extends LeafResult,
  C extends Context
>(connect: ReporterConnector<A, R, C>): ResultProcessor<R, A, C> {
  return (result: R) => (context: C): ReaderTask<A, void> => {
    return (reporters) => {
      const reporter = connect(reporters);
      return reporter(result, context);
    };
  };
}

// keys result contains data that always exists in database

export function keys<
  A extends Reporters,
  R extends KeysResult<SR, K>,
  K extends Key,
  SR extends Result,
  C extends Context
>(subProcessor: ResultProcessor<SR, A, Prepend<K, C>>): ResultProcessor<R, A, C> {
  return (result: R) => (context: C): ReaderTask<A, void> => {
    return (reporters) => {
      const tasks: Array<Task<void>> = pipe(
        result,
        Dict_.mapWithIndex((key: K, subResult: SR) => {
          const subContext = pipe(
            context,
            Onion_.prepend(key),
          );
          return subProcessor(subResult)(subContext)(reporters);
        }),
        Array_.map(([_k, v]) => v),
      );
      return Foldable_.traverse_(taskSeq, array)(tasks, identity);
    };
  };
}

// ids result contains data that may not exist in database

export function ids<
  A extends Reporters,
  R extends IdsResult<SR, I, E>,
  I extends Id,
  SR extends Result,
  C extends Context,
  E extends Err
>(
  connect: ReporterConnector<A, ExistenceResult<E>, Prepend<I, C>>,
  subProcessor: ResultProcessor<SR, A, Prepend<I, C>>,
): ResultProcessor<R, A, C> {
  return (result: R) => (context: C): ReaderTask<A, void> => {
    return (reporters) => {
      const tasks: Array<Task<void>> = pipe(
        result,
        Dict_.mapWithIndex((id: I, maybeSubResult: Either<E, Option<SR>>) => {
          const subContext = pipe(
            context,
            Onion_.prepend(id),
          );
          return pipe(
            maybeSubResult,
            Either_.fold(
              (err) => [connect(reporters)(Either_.left<E, Existence>(err), subContext)],
              (opt) =>
                pipe(
                  opt,
                  Option_.fold(
                    () => [
                      connect(reporters)(Either_.right<E, Existence>(false), subContext),
                    ],
                    (subResult) => [
                      connect(reporters)(Either_.right<E, Existence>(true), subContext),
                      subProcessor(subResult)(subContext)(reporters),
                    ],
                  ),
                ),
            ),
          );
        }),
        Array_.map(([_k, v]) => v),
        Array_.flatten,
      );
      return Foldable_.traverse_(taskSeq, array)(tasks, identity);
    };
  };
}

// search result contains data that may contain zero or more instances in the database

export function search<
  A extends Reporters,
  R extends SearchResult<SR, T, I, E>,
  T extends Terms,
  I extends Id,
  SR extends Result,
  C extends Context,
  E extends Err
>(
  connect: ReporterConnector<A, Either<E, Array<I>>, Prepend<T, C>>,
  subProcessor: ResultProcessor<SR, A, Prepend<I, C>>,
): ResultProcessor<R, A, C> {
  return (result: R) => (context: C): ReaderTask<A, void> => {
    return (reporters) => {
      const tasks: Array<Task<void>> = pipe(
        result,
        Dict_.mapWithIndex(
          (terms: T, maybeSubResult: Either<E, Dict<I, SR>>): Array<Task<void>> => {
            const termsContext = pipe(
              context,
              Onion_.prepend(terms),
            );
            return pipe(
              maybeSubResult,
              Either_.fold(
                (err) => [
                  connect(reporters)(Either_.left<E, Array<I>>(err), termsContext),
                ],
                (subResults: Dict<I, SR>): Array<Task<void>> => {
                  const reportIds: Task<void> = pipe(
                    Dict_.keys(subResults),
                    (ids: Array<I>): Task<void> =>
                      connect(reporters)(Either_.right<E, Array<I>>(ids), termsContext),
                  );
                  const reportResults: Array<Task<void>> = pipe(
                    subResults,
                    Array_.map(([id, subResult]: [I, SR]) => {
                      const idContext = pipe(
                        context,
                        Onion_.prepend(id),
                      );
                      return subProcessor(subResult)(idContext)(reporters);
                    }),
                  );
                  return pipe(
                    [[reportIds], reportResults],
                    Array_.flatten,
                  );
                },
              ),
            );
          },
        ),
        (x: Dict<T, Array<Task<void>>>) => x,
        Array_.map(([_k, v]) => v),
        Array_.flatten,
      );
      return Foldable_.traverse_(taskSeq, array)(tasks, identity);
    };
  };
}

// properties result contains results for a set of optional queries

export function properties<
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
