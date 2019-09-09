import { Prepend, Reverse } from 'typescript-tuple';
import * as Record_ from 'fp-ts/lib/Record';
import { Task, task } from 'fp-ts/lib/Task';
import * as Task_ from 'fp-ts/lib/Task';
import { Option } from 'fp-ts/lib/Option';
import * as Option_ from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

export const reverse = <A extends Array<any>>(a: A): Reverse<A> => {
  /* eslint-disable fp/no-mutating-methods */
  return (a.reverse() as unknown) as Reverse<A>;
};

export const prepend = <A extends Array<any>, X>(args: A, x: X): Prepend<A, X> =>
  [...args, x] as Prepend<A, X>;

// all processors share these generic processor types

export type Context = Array<string>;
export type QueryProcessor<Q, R> = (q: Q) => Task<R>;
export type QueryProcessorFactory<A, Q, R, C extends Context> = (
  a: A,
) => (c: C) => QueryProcessor<Q, R>;

// literal query contains static information that can be replaced with another literal

export function literal<A, Q, R, C extends Context>(
  constant: R,
): QueryProcessorFactory<A, Q, R, C> {
  return (_0) => (_1) => (_2) => {
    return Task_.of(constant);
  };
}

// leaf query contains information for retrieving a payload

export type LeafQueryConnector<A, R, C extends Context> = (a: A) => (c: Reverse<C>) => Task<R>;

export function leaf<A, R, C extends Context>(
  connect: LeafQueryConnector<A, R, C>,
): QueryProcessorFactory<A, true, R, C> {
  return (resolvers) => (context: C) => (query: true): Task<R> => connect(resolvers)(reverse(context));
}

// keys query requests some information that is always present in database

export function keys<
  A,
  Q extends Record<I, SQ>,
  I extends string,
  SQ,
  SR,
  C extends Context
>(
  subProcessor: QueryProcessorFactory<A, SQ, SR, Prepend<C, I>>,
): QueryProcessorFactory<A, Q, Record<I, SR>, C> {
  return (resolvers: A) => (context: C) => (query: Q): Task<Record<I, SR>> =>
    pipe(
      query,
      Record_.mapWithIndex(
        (id: I, subQuery: SQ): Task<SR> =>
          subProcessor(resolvers)(prepend(context, id))(subQuery),
      ),
      Record_.sequence(task),
    );
}

// keys query requests some information that may not be present in database

export type ExistenceCheckConnector<A> = (a: A) => (i: string) => Task<boolean>;

export function ids<
  A,
  Q extends Record<I, SQ>,
  I extends string,
  SQ,
  SR,
  C extends Context
>(
  connect: ExistenceCheckConnector<A>,
  subProcessor: QueryProcessorFactory<A, SQ, SR, Prepend<C, I>>,
): QueryProcessorFactory<A, Q, Record<I, Option<SR>>, C> {
  return (resolvers: A) => (context: C) => (query: Q) => {
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
                    subProcessor(resolvers)(prepend(context, id))(subQuery),
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

export type QueryProcessorFactoryMapping<A, Q, R, C extends Context> = {
  [I in keyof Q & keyof R]: QueryProcessorFactory<A, Required<Q>[I], Required<R>[I], C>;
};

export function properties<A, Q, R, C extends Context>(
  processors: QueryProcessorFactoryMapping<A, Q, R, C>,
): QueryProcessorFactory<A, Q, R, C> {
  return (resolvers: A) => (context: C) => <P extends string & keyof Q & keyof R>(
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
