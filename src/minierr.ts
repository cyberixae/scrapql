import { Tuple } from './tuple';


type ResultConstructor<
  R extends unknown = unknown,
  A extends Array<any> = Array<any>
> = (...args: A) => R;

export function foo<RC extends ResultConstructor>(rc: RC) {
  const bar: ReturnType<RC> = rc();
  return bar;
}




type Json = unknown;

type Id = string;
type Key = string;
type Property = string;

type ExistenceQuery<Q extends Id = Id> = Q & {
  readonly ExistenceQuery: unique symbol;
};

type Foo = number | Record<string, Foo>

type LiteralQuery = Json;
type LeafQuery = Json;
type KeysQuery<SQ extends Query = Json, K extends Key = Key> = Record<K, SQ>;
type IdsQuery<SQ extends Query = Json, I extends Id = Id> = Record<I, SQ>;
type PropertiesQuery<
  Q extends { [I in Property]: Query } = { [I in Property]: Json }
> = Partial<Q>;

type FetchableQuery = LeafQuery | ExistenceQuery;
type StructuralQuery = LiteralQuery | KeysQuery | IdsQuery | PropertiesQuery;

type Query = StructuralQuery | FetchableQuery;

type QueryConstructor<
  Q extends Query = Query,
  A extends Tuple = Tuple
> = (...args: A) => Q;

export function bar<QC extends QueryConstructor>(qc: QC) {
  const bar: ReturnType<QC> = qc();
  return bar;
}
