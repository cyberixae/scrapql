import { Option } from 'fp-ts/lib/Option';
import { Either } from 'fp-ts/lib/Either';

import { Tuple } from './tuple';

type Json = unknown;

type Id = string;
type Key = string;
type Property = string;
type Err = Json;

type Existence = boolean;
type ExistenceResult<E extends Err = Err> = Either<E, Existence>;
type LiteralResult = Json;
type LeafResult = Json;
type KeysResult<SR extends Result = Json, K extends Key = Key> = Record<K, SR>;
type IdsResult<SR extends Result = Json, I extends Id = Id, E extends Err = Err> = Record<
  I,
  Either<E, Option<SR>>
>;
type PropertiesResult<
  R extends { [I in Property]: Result } = { [I in Property]: Json }
> = Partial<R>;

type ReportableResult = LeafResult | ExistenceResult;

type Result = ReportableResult;

type Constructor<T, A extends Tuple = Tuple> = (...args: A) => T;

type ResultConstructorArgs = Tuple;

type ResultConstructor<
  R extends Result = Result,
  A extends ResultConstructorArgs = ResultConstructorArgs
> = Constructor<R, A>;

export function foo<RC extends ResultConstructor>(rc: RC) {
  const bar: ReturnType<RC> = rc();
  return bar;
}
