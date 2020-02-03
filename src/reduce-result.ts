import { Either, either } from 'fp-ts/lib/Either';
import { NonEmptyArray, nonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import * as NonEmptyArray_ from 'fp-ts/lib/NonEmptyArray';
import { Option, option } from 'fp-ts/lib/Option';
import * as Either_ from 'fp-ts/lib/Either';
import * as Array_ from 'fp-ts/lib/Array';
import * as Option_ from 'fp-ts/lib/Option';
import * as Record_ from 'fp-ts/lib/Record';
import { Lazy } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import { Dict } from './dict';
import * as Dict_ from './dict';
import { mergeOption } from './option';

import {
  Result,
  LiteralResult,
  LeafResult,
  Key,
  KeysResult,
  Id,
  IdsResult,
  Terms,
  SearchResult,
  Property,
  PropertiesResult,
  Err,
  Results,
  ResultReducer,
  LeafResultCombiner,
  ResultReducerMapping,
} from './scrapql';

export const literal = <L extends LiteralResult<any>>(results: Results<L>): L =>
  pipe(
    NonEmptyArray_.tail(results),
    Array_.reduce(
      NonEmptyArray_.head(results),
      (a: L, b: L): L => {
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          // eslint-disable-next-line
          throw new Error('result literal mismatch');
        }
        return a;
      },
    ),
  );

export const leaf = <R extends LeafResult<any>>(
  combineLeafResult: LeafResultCombiner<R>,
) => (results: Results<R>): R => {
  const writeResult: R = NonEmptyArray_.head(results);
  const readResult: Array<R> = NonEmptyArray_.tail(results);

  return pipe(
    readResult,
    Array_.reduce(writeResult, combineLeafResult),
  );
};

export const keys = <K extends Key<any>, SR extends Result<any>>(
  reduceSubResult: ResultReducer<SR>,
) => (results: Results<KeysResult<SR, K>>): KeysResult<SR, K> =>
  pipe(
    results,
    Dict_.mergeSymmetric((subResultVariants) =>
      pipe(
        reduceSubResult(subResultVariants),
        Option_.some,
      ),
    ),
    Option_.getOrElse(
      (): Dict<K, SR> => {
        // eslint-disable-next-line fp/no-throw
        throw new Error('reduce error, keys results not symmetric');
      },
    ),
  );

export const ids = <I extends Id<any>, E extends Err<any>, SR extends Result<any>>(
  reduceSubResult: ResultReducer<SR>,
  existenceChange: Lazy<E>,
) => (results: Results<IdsResult<SR, I, E>>): IdsResult<SR, I, E> =>
  pipe(
    results,
    Dict_.mergeSymmetric((subResultVariants) =>
      pipe(
        subResultVariants,
        nonEmptyArray.sequence(either),
        Either_.map(mergeOption),
        Either_.chain(Either_.fromOption(existenceChange)),
        Either_.map(nonEmptyArray.sequence(option)),
        Either_.map(
          Option_.map(
            (subResultVariants: Results<SR>): SR => reduceSubResult(subResultVariants),
          ),
        ),
        Option_.some,
      ),
    ),
    Option_.getOrElse(
      (): Dict<I, Either<E, Option<SR>>> => {
        // eslint-disable-next-line fp/no-throw
        throw new Error('reduce error, ids results not symmetric');
      },
    ),
  );

export const search = <
  T extends Terms<any>,
  I extends Id<any>,
  E extends Err<any>,
  SR extends Result<any>
>(
  reduceSubResult: ResultReducer<SR>,
  matchChange: Lazy<E>,
) => (results: Results<SearchResult<SR, T, I, E>>): SearchResult<SR, T, I, E> =>
  pipe(
    results,
    Dict_.mergeSymmetric(
      (
        subResultVariants: NonEmptyArray<Either<E, Dict<I, SR>>>,
      ): Option<Either<E, Dict<I, SR>>> =>
        pipe(
          subResultVariants,
          nonEmptyArray.sequence(either),
          Either_.chain(
            (optionalResults: NonEmptyArray<Dict<I, SR>>): Either<E, Dict<I, SR>> =>
              pipe(
                optionalResults,
                Dict_.mergeSymmetric(reduceSubResult),
                Either_.fromOption(matchChange),
              ),
          ),
          Option_.some,
        ),
    ),
    Option_.getOrElse(
      (): Dict<T, Either<E, Dict<I, SR>>> => {
        // eslint-disable-next-line fp/no-throw
        throw new Error('reduce error, search results are not symmetric');
      },
    ),
  );

export const properties = <R extends PropertiesResult<any>>(
  processors: ResultReducerMapping<R>,
) => <P extends Property & keyof R>(results: Results<R>): R =>
  pipe(
    NonEmptyArray_.head(results),
    Record_.mapWithIndex<P, unknown, R[P]>((propName) => {
      const propReducer = processors[propName];
      return pipe(
        results,
        NonEmptyArray_.map((r) => r[propName]),
        propReducer,
      );
    }),
  ) as R;
