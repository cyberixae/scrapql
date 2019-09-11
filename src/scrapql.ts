import { Concat, Reverse } from 'typescript-tuple';
import { Option } from 'fp-ts/lib/Option';
import { Task } from 'fp-ts/lib/Task';
import * as query from './query';
import * as result from './result';

export type Json = unknown;

export type Id = string;
export type Key = string;
export type Property = string;

export type JsonQuery = {
  Q: Json;
  R: Json;
};

export type ExistenceQuery = {
  Q: never;
  R: boolean;
};

export type LiteralQuery = {
  Q: Json;
  R: Json;
};

export type LeafQuery = {
  Q: true;
  R: Json;
};

export type KeysQuery<K extends Key = Key, S extends Query = JsonQuery> = {
  Q: Record<K, S['Q']>;
  R: Record<K, S['R']>;
};

export type IdsQuery<I extends Id = Id, S extends Query = JsonQuery> = {
  Q: Record<I, S['Q']>;
  R: Record<I, Option<S['R']>>;
};

export type PropertiesQuery<
  O extends { [I in Property]: Query } = { [I in Property]: JsonQuery }
> = Partial<O>;

export type ActionableQuery = {
  Q: LeafQuery['Q'] | ExistenceQuery['Q'];
  R: LeafQuery['R'] | ExistenceQuery['R'];
};
export type StructuralQuery = {
  Q: LiteralQuery['Q'] | KeysQuery['Q'] | IdsQuery['Q'] | PropertiesQuery['Q'];
  R: LiteralQuery['R'] | KeysQuery['R'] | IdsQuery['R'] | PropertiesQuery['R'];
};

export type Query = {
  Q: StructuralQuery['Q'] | ActionableQuery['Q'];
  R: StructuralQuery['R'] | ActionableQuery['R'];
};

export type Context = Array<string>; // really a tuple (T extends Array<string>)

export type Processor<I, O> = (i: I) => Task<O>;
export type QueryProcessor<Q extends Query['Q'], R> = Processor<Q, R>;
export type ResultProcessor<R extends Query['R']> = Processor<R, void>;

export type API<T> = Record<string, T>;
export type ResolverAPI = API<any>; // should be API<Resolver>
export type ReporterAPI = API<any>; // should be API<Reporter>

export type Reporter<R extends Query['R'], C extends Context> = (
  ...a: Concat<Reverse<C>, [R]>
) => Task<void>;

export type ReporterConnector<
  A extends ReporterAPI,
  R extends Query['R'],
  C extends Context
> = (a: A) => Reporter<R, C>;

export type ResultProcessorBuilderMapping<
  A extends ReporterAPI,
  R extends PropertiesQuery['R'],
  C extends Context
> = {
  [I in keyof Required<R>]: Build<ResultProcessor<Required<R>[I]>, A, C>;
};

export type Resolver<R extends Query['R'], C extends Context> = (
  ...c: Reverse<C>
) => Task<R>;

export type ResolverConnector<
  A extends ResolverAPI,
  R extends Query['R'],
  C extends Context
> = (a: A) => Resolver<R, C>;

export type QueryProcessorBuilderMapping<
  A extends ResolverAPI,
  Q extends PropertiesQuery['Q'],
  R extends PropertiesQuery['R'],
  C extends Context
> = {
  [I in keyof Q & keyof R]: Build<QueryProcessor<Required<Q>[I], Required<R>[I]>, A, C>;
};

export type Build<
  P extends Processor<any, any>,
  A extends API<any>,
  C extends Context
> = (a: A) => (c: C) => P;

export function init<P extends Processor<any, any>, A extends API<any>>(
  builder: Build<P, A, []>,
  api: A,
): P {
  return builder(api)([]);
}

export const process = {
  query,
  result,
};
