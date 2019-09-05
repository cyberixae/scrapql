import * as Record_ from 'fp-ts/lib/Record';
import { Task, task } from 'fp-ts/lib/Task';
import * as Task_ from 'fp-ts/lib/Task';
import { Option } from 'fp-ts/lib/Option';
import * as Option_ from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

// all processors share these generic processor types
// nop processor is neede because of this problem https://github.com/Microsoft/TypeScript/issues/13195
export type Context = Array<string>;
export type QP<Q, R> = (q: Q, ...c: Context) => Task<R>;
export type QueryProcessor<Q, R> = {
  (q: Q, ...c: Context): Task<R>;
  (q: undefined, ...c: Context): Task<undefined>;
};
export type QueryProcessorFactory<A, Q, R> = (a: A) => QueryProcessor<Q, R>;

function handleUndefined<Q, R>(real: QP<Q, R>): QueryProcessor<Q, R> {
  return (query: Q|undefined, ...context: Context) => {
    const strict: Task<R|undefined> = pipe(
      query,
      Option_.fromNullable,
      Option_.fold(
        (): Task<R|undefined> => Task_.of(undefined), 
        (query: Q): Task<R|undefined> => real(query, ...context),
      ),
    );
    return strict as Task<any>;
  };
}


// helper functions

export function literal<A, Q, R>(constant: R): QueryProcessorFactory<A, Q, R> {
  return (_0) => (query: Q|undefined, ..._99: Context) => {
    const strict: Task<R|undefined> = pipe(
      query,
      Option_.fromNullable,
      Option_.fold(
        (): Task<R|undefined> => Task_.of(undefined), 
        (): Task<R|undefined> => Task_.of(constant),
      ),
    );
    return strict as Task<any>;
  };
}

// leaf query contains information for retrieving a payload

export type LeafQueryConnector<A, R> = (a: A) => (...k: Context) => Task<R|undefined>;

export function leaf<A, R>(connect: LeafQueryConnector<A, R>): QueryProcessorFactory<A, true, R> {
  return (resolvers) => (query: true|undefined, ...context: Context): Task<any> => {
    const strict: Task<R|undefined> = pipe(
      query,
      Option_.fromNullable,
      Option_.fold(
        () => Task_.of(undefined), 
        () => connect(resolvers)(...context),
      ),
    );
    return strict as Task<any>;
  };
}

// keys query requests some information that is always present in database

export function keys<A, Q extends Record<I, SQ>, I extends string, SQ, SR>(
  subProcessor: QueryProcessorFactory<A, SQ, SR>,
): QueryProcessorFactory<A, Q, Record<I, SR>> {
  return (resolvers: A) => (query: Q|undefined, ...context: Context): Task<any> => {
    const strict: Task<Record<I, SR>> = pipe(
      query,
      Record_.mapWithIndex((id: I, subQuery: SQ): Task<SR> => subProcessor(resolvers)(subQuery, id, ...context)),
      Record_.sequence(task),
    );
    return strict;
  };
}

// keys query requests some information that may not be present in database

export type ExistenceCheckConnector<A> = (a: A) => (i: string) => Task<boolean>;

export function ids<A, Q extends Record<I, SQ>, I extends string, SQ, SR>(
  connect: ExistenceCheckConnector<A>,
  subProcessor: QueryProcessorFactory<A, SQ, SR>,
): QueryProcessorFactory<A, Q, Record<I, Option<SR>>> {
  return (resolvers: A) => (query: Q|undefined, ...context: Context) => {
    const tasks: Record<I, Task<Option<SR>>> = pipe(
      query,
      Record_.mapWithIndex(
        (id: I, subQuery: SQ): Task<Option<SR>> => {
          return pipe(
            connect(resolvers)(id),
            Task_.chain(
              (exists): Task<Option<SR>> => {
                if (exists) {
                  return pipe(
                    subProcessor(resolvers)(subQuery, id, ...context),
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

export type QueryProcessorFactoryMapping<
  A,
  Q,
  R extends Record<keyof Q, any>,
> = { [I in keyof Required<Q>]: QueryProcessorFactory<A, Q[I], R[I]> };

export function properties<
  A,
  Q,
  R extends Record<keyof Q, any>,
  P extends string & keyof Q & keyof R
>(processors: QueryProcessorFactoryMapping<A, Q, R>): QueryProcessorFactory<A, Q, Record<P, R[P]>> {
  return (resolvers: A) => (query: Q|undefined, ...context: Context) => {
    const tasks: Record<P, Task<R[P]>> = pipe(
      query,
      Record_.mapWithIndex((property, subQuery: Q[P]) => {
        const processor = processors[property];
        const subResult = processor(resolvers)(subQuery, ...context);
        return subResult;
      }),
    );
    return Record_.sequence(task)(tasks);
  };
}
