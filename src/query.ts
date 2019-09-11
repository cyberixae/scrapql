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
  Build,
  QueryProcessor,
  Context,
  ResolverConnector,
  ResolverAPI,
  QueryProcessorBuilderMapping,
  ExistenceQuery,
  LiteralQuery,
  LeafQuery,
  Key,
  KeysQuery,
  Id,
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
  Q extends LiteralQuery['Q'],
  R extends LiteralQuery['R'],
  C extends Context
>(constant: R): Build<QueryProcessor<Q, R>, A, C> {
  return (_resolvers: A) => (_context: C) => (_query: Q) => {
    return Task_.of(constant);
  };
}

// leaf query contains information for retrieving a payload

export function leaf<
  A extends ResolverAPI,
  Q extends LeafQuery['Q'],
  R extends LeafQuery['R'],
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
  Q extends KeysQuery<K, SQ>['Q'],
  K extends Key & keyof Q,
  SQ extends Query,
  C extends Context
>(
  subProcessor: Build<QueryProcessor<SQ['Q'], SQ['R']>, A, Prepend<C, K>>,
): Build<QueryProcessor<Q, KeysQuery<K, SQ>['R']>, A, C> {
  return (resolvers: A) => (context: C) => (query: Q): Task<KeysQuery<K, SQ>['R']> =>
    pipe(
      query,
      Record_.mapWithIndex(
        (key: K, subQuery: SQ['Q']): Task<SQ['R']> => {
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
  Q extends IdsQuery<I, SQ>,
  I extends Id & keyof Q,
  SQ extends Query,
  C extends Context
>(
  connect: ResolverConnector<A, ExistenceQuery['R'], Prepend<C, I>>,
  subProcessor: Build<QueryProcessor<SQ['Q'], SQ['R']>, A, Prepend<C, I>>,
): Build<QueryProcessor<Q, IdsQuery<I, SQ>['R']>, A, C> {
  return (resolvers: A) => (context: C) => (query: Q) => {
    const tasks: Record<I, Task<Option<SQ['R']>>> = pipe(
      query,
      Record_.mapWithIndex(
        (id: I, subQuery: SQ['Q']): Task<Option<SQ['R']>> => {
          const subContext = pipe(
            context,
            Tuple_.prepend(id),
          );
          const existenceCheck = connect(resolvers);
          return pipe(
            existenceCheck(...resolverArgsFrom(subContext)),
            Task_.chain(
              (exists): Task<Option<SQ['R']>> => {
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
  Q extends PropertiesQuery['Q'],
  R extends PropertiesQuery['R'],
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
