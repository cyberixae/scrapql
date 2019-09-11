import { Reverse } from 'typescript-tuple';
import { Prepend } from 'typescript-tuple';
import * as Record_ from 'fp-ts/lib/Record';
import { Task, task } from 'fp-ts/lib/Task';
import * as Task_ from 'fp-ts/lib/Task';
import { Option } from 'fp-ts/lib/Option';
import * as Option_ from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

import * as Tuple_ from './tuple';
import {
  Query,
  Result,
  Build,
  QueryProcessor,
  Context,
  ResolverConnector,
  ResolverAPI,
  QueryProcessorBuilderMapping,
  LiteralQuery,
  LeafQuery,
  Key,
  KeysQuery,
  Id,
  IdExistence,
  IdsQuery,
  Property,
  PropertiesQuery,
} from './scrapql';

// helper functions

function resolverArgsFrom<C extends Context>(context: C): Reverse<C> {
  return pipe(
    context,
    Tuple_.reverse,
  );
}

// literal query contains static information that can be replaced with another literal

export function literal<
  A extends ResolverAPI,
  Q extends LiteralQuery,
  R extends Result,
  C extends Context
>(constant: R): Build<QueryProcessor<Q, R>, A, C> {
  return (_resolvers: A) => (_context: C) => (_query: Q) => {
    return Task_.of(constant);
  };
}

// leaf query contains information for retrieving a payload

export function leaf<
  A extends ResolverAPI,
  Q extends LeafQuery,
  R extends Result,
  C extends Context
>(connect: ResolverConnector<A, R, C>): Build<QueryProcessor<Q, R>, A, C> {
  return (resolvers) => (context) => (_query: Q) => {
    const resolver = connect(resolvers);
    const args = resolverArgsFrom(context);
    return resolver(...args);
  };
}

// keys query requests some information that is always present in database

export function keys<
  A extends ResolverAPI,
  Q extends KeysQuery<SQ>,
  I extends Key & keyof Q,
  SQ extends Query,
  SR extends Result,
  C extends Context
>(
  subProcessor: Build<QueryProcessor<SQ, SR>, A, Prepend<C, I>>,
): Build<QueryProcessor<Q, Record<I, SR>>, A, C> {
  return (resolvers: A) => (context: C) => (query: Q): Task<Record<I, SR>> =>
    pipe(
      query,
      Record_.mapWithIndex(
        (key: I, subQuery: SQ): Task<SR> => {
          const subContext = pipe(
            context,
            Tuple_.prepend(key),
          );
          return subProcessor(resolvers)(subContext)(subQuery);
        },
      ),
      Record_.sequence(task),
    );
}

// keys query requests some information that may not be present in database

export function ids<
  A extends ResolverAPI,
  Q extends IdsQuery<SQ>,
  I extends Id & keyof Q,
  SQ extends Query,
  SR extends Result,
  C extends Context
>(
  connect: ResolverConnector<A, IdExistence, Prepend<C, I>>,
  subProcessor: Build<QueryProcessor<SQ, SR>, A, Prepend<C, I>>,
): Build<QueryProcessor<Q, Record<I, Option<SR>>>, A, C> {
  return (resolvers: A) => (context: C) => (query: Q) => {
    const tasks: Record<I, Task<Option<SR>>> = pipe(
      query,
      Record_.mapWithIndex(
        (id: I, subQuery: SQ): Task<Option<SR>> => {
          const subContext = pipe(
            context,
            Tuple_.prepend(id),
          );
          return pipe(
            connect(resolvers)(...resolverArgsFrom(subContext)),
            Task_.chain(
              (exists): Task<Option<SR>> => {
                if (exists) {
                  return pipe(
                    subProcessor(resolvers)(subContext)(subQuery),
                    Task_.map(Option_.some),
                  );
                }
                return Task_.of(Option_.none);
              },
            ),
          );
        },
      ),
    );
    return Record_.sequence(task)(tasks);
  };
}

// properties query contains optional queries that may or may not be present

export function properties<
  A extends ResolverAPI,
  Q extends PropertiesQuery,
  R extends Result,
  C extends Context
>(
  processors: QueryProcessorBuilderMapping<A, Q, R, C>,
): Build<QueryProcessor<Q, R>, A, C> {
  return (resolvers: A) => (context: C) => <P extends Property & keyof Q & keyof R>(
    query: Q,
  ): Task<R> => {
    const tasks: Record<P, Task<R[P]>> = pipe(
      query,
      Record_.mapWithIndex((property, subQuery: Q[P]) => {
        const processor = processors[property];
        const subResult = processor(resolvers)(context)(subQuery);
        return subResult;
      }),
    );
    const result: Task<Record<P, R[P]>> = Record_.sequence(task)(tasks);

    return result as Task<R>;
  };
}
