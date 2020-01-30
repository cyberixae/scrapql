import * as Record_ from 'fp-ts/lib/Record';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import * as TaskEither_ from 'fp-ts/lib/TaskEither';
import { Task, task } from 'fp-ts/lib/Task';
import { ReaderTask } from 'fp-ts/lib/ReaderTask';
import * as Task_ from 'fp-ts/lib/Task';
import { Option } from 'fp-ts/lib/Option';
import * as Option_ from 'fp-ts/lib/Option';
import * as boolean_ from 'fp-ts/lib/boolean';
import { pipe } from 'fp-ts/lib/pipeable';

import { Dict } from './dict';
import * as Dict_ from './dict';
import { Prepend } from './onion';
import * as Context_ from './onion';
import {
  Query,
  Result,
  QueryProcessor,
  Context,
  ResolverConnector,
  Resolvers,
  QueryProcessorMapping,
  LiteralQuery,
  LeafQuery,
  Key,
  KeysQuery,
  Id,
  IdsQuery,
  Property,
  PropertiesQuery,
  LiteralResult,
  LeafResult,
  KeysResult,
  ExistenceResult,
  ExistenceQuery,
  existenceQuery,
  IdsResult,
  PropertiesResult,
  Existence,
  Err,
} from './scrapql';

// literal query contains static information that can be replaced with another literal

export function literal<
  A extends Resolvers<any>,
  Q extends LiteralQuery<any>,
  R extends LiteralResult<any>,
  C extends Context
>(constant: R): QueryProcessor<Q, R, A, C> {
  return (_query: Q) => (_context: C): ReaderTask<A, R> => {
    return (_resolvers) => Task_.of(constant);
  };
}

// leaf query contains information for retrieving a payload

export function leaf<
  A extends Resolvers<any>,
  Q extends LeafQuery<any>,
  R extends LeafResult<any>,
  C extends Context
>(connect: ResolverConnector<A, Q, R, C>): QueryProcessor<Q, R, A, C> {
  return (query: Q) => (context: C): ReaderTask<A, R> => {
    return (resolvers) => {
      const resolver = connect(resolvers);
      return resolver(query, context);
    };
  };
}

// keys query requests some information that is always present in database

export function keys<
  A extends Resolvers<any>,
  Q extends KeysQuery<SQ, K>,
  K extends Key,
  SQ extends Query<any>,
  SR extends Result<any>,
  C extends Context
>(
  subProcessor: QueryProcessor<SQ, SR, A, Prepend<K, C>>,
): QueryProcessor<Q, KeysResult<SR, K>, A, C> {
  return (query: Q) => (context: C): ReaderTask<A, KeysResult<SR, K>> => {
    return (resolvers) =>
      pipe(
        query,
        Dict_.mapWithIndex(
          (key: K, subQuery: SQ): Task<SR> => {
            const subContext = pipe(
              context,
              Context_.prepend(key),
            );
            return subProcessor(subQuery)(subContext)(resolvers);
          },
        ),
        Dict_.sequenceTask,
      );
  };
}

// keys query requests some information that may not be present in database

export function ids<
  A extends Resolvers<any>,
  Q extends IdsQuery<SQ, I>,
  I extends Id,
  SQ extends Query<any>,
  SR extends Result<any>,
  C extends Context,
  E extends Err
>(
  connect: ResolverConnector<A, ExistenceQuery<I>, ExistenceResult<E>, C>,
  subProcessor: QueryProcessor<SQ, SR, A, Prepend<I, C>>,
): QueryProcessor<Q, IdsResult<SR, I, E>, A, C> {
  return (query: Q) => (context: C): ReaderTask<A, IdsResult<SR, I, E>> => {
    return (resolvers) => {
      const tasks: Dict<I, TaskEither<E, Option<SR>>> = pipe(
        query,
        Dict_.mapWithIndex(
          (id: I, subQuery: SQ): TaskEither<E, Option<SR>> => {
            const subContext = pipe(
              context,
              Context_.prepend(id),
            );
            const existenceCheck = connect(resolvers);
            return pipe(
              existenceCheck(existenceQuery(id), context),
              TaskEither_.chain((exists: Existence) =>
                pipe(
                  exists,
                  boolean_.fold(
                    (): TaskEither<E, Option<SR>> => TaskEither_.right(Option_.none),
                    (): TaskEither<E, Option<SR>> =>
                      pipe(
                        subProcessor(subQuery)(subContext)(resolvers),
                        Task_.map(Option_.some),
                        TaskEither_.rightTask,
                      ),
                  ),
                ),
              ),
            );
          },
        ),
      );
      return Dict_.sequenceTask(tasks);
    };
  };
}

/*
export function search<
  A extends Resolvers<any>,
  Q extends TermsQuery<SQ, EQ>,
  I extends Id,
  EQ extends ExistenceQuery<I>,
  SQ extends Query,
  SR extends Result,
  C extends Context,
  E extends Err
>(
  connect: ResolverConnector<A, EQ, ExistenceResult<E, I>, C>,
  subProcessor: QueryProcessor<SQ, SR, A, Prepend<I, C>>,
): QueryProcessor<Q, IdsResult<SR, EQ, I, E>, A, C> {
  return (query: Q) => (context: C): ReaderTask<A, IdsResult<SR, EQ, I, E>> => {
    return (resolvers) => {
      const tasks: Dict<EQ, TaskEither<E, Option<[I, SR]>>> = pipe(
        query,
        Dict_.mapWithIndex(
          (eq: EQ, subQuery: SQ): TaskEither<E, Option<[I, SR]>> => {
            const existenceCheck = connect(resolvers);
            return pipe(
              existenceCheck(eq, context),
              TaskEither_.chain((exists: Option<I>) =>
                pipe(
                  exists,
                  Option_.fold(
                    (): TaskEither<E, Option<[I, SR]>> => TaskEither_.right(Option_.none),
                    (id: I): TaskEither<E, Option<[I, SR]>> => {
                      const subContext = pipe(
                        context,
                        Context_.prepend(id),
                      );
                      return pipe(
                        subProcessor(subQuery)(subContext)(resolvers),
                        Task_.map((sr: SR): Option<[I, SR]> => Option_.some([id, sr])),
                        TaskEither_.rightTask,
                      );
                    },
                  ),
                ),
              ),
            );
          },
        ),
      );
      return Dict_.sequenceTask(tasks);
    };
  };
}
*/

// properties query contains optional queries that may or may not be present

export function properties<
  A extends Resolvers<any>,
  Q extends PropertiesQuery<any>,
  R extends PropertiesResult<any>,
  C extends Context
>(processors: QueryProcessorMapping<A, Q, R, C>): QueryProcessor<Q, R, A, C> {
  return <P extends Property & keyof Q & keyof R>(query: Q) => (
    context: C,
  ): ReaderTask<A, R> => {
    return (resolvers) => {
      const tasks: Record<P, Task<R[P]>> = pipe(
        query,
        Record_.mapWithIndex((property, subQuery: Q[P]) => {
          const processor = processors[property];
          const subResult = processor(subQuery)(context)(resolvers);
          return subResult;
        }),
      );
      const result: Task<Record<P, R[P]>> = Record_.sequence(task)(tasks);

      return result as Task<R>;
    };
  };
}
