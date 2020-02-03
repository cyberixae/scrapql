import { Either, either } from 'fp-ts/lib/Either';
import { NonEmptyArray, nonEmptyArray } from 'fp-ts/lib/NonEmptyArray';
import * as NonEmptyArray_ from 'fp-ts/lib/NonEmptyArray';
import { Option, None, Some, option } from 'fp-ts/lib/Option';
import * as Either_ from 'fp-ts/lib/Either';
import * as Array_ from 'fp-ts/lib/Array';
import * as Option_ from 'fp-ts/lib/Option';
import * as Record_ from 'fp-ts/lib/Record';
import { Lazy } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import { Dict } from './dict';
import * as Dict_ from './dict';

import {
  Result,
  LiteralResult,
  LeafResult,
  Key,
  KeysResult,
  Id,
  IdsResult,
  //  Terms,
  //  SearchResult,
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
  reduceSubResults: ResultReducer<SR>,
) => (results: Results<KeysResult<SR, K>>): KeysResult<SR, K> =>
  pipe(
    results,
    Dict_.mergeSymmetric((subResults) =>
      pipe(
        reduceSubResults(subResults),
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

const isAllNone = <T>(
  options: NonEmptyArray<Option<T>>,
): options is NonEmptyArray<None> =>
  pipe(
    options,
    NonEmptyArray_.filter(Option_.isSome),
    Option_.isNone,
  );

const isAllSome = <T>(
  options: NonEmptyArray<Option<T>>,
): options is NonEmptyArray<None> =>
  pipe(
    options,
    NonEmptyArray_.filter(Option_.isNone),
    Option_.isNone,
  );

export const ids = <I extends Id<any>, E extends Err<any>, SR extends Result<any>>(
  reduceSubResults: ResultReducer<SR>,
  existenceChange: Lazy<E>,
) => (results: Results<IdsResult<SR, I, E>>): IdsResult<SR, I, E> =>
  pipe(
    results,
    Dict_.mergeSymmetric(
      (variants: NonEmptyArray<Either<E, Option<SR>>>): Option<Either<E, Option<SR>>> =>
        pipe(
          variants,
          nonEmptyArray.sequence(either),
          Either_.chain(
            (
              optionalResults: NonEmptyArray<Option<SR>>,
            ): Either<E, NonEmptyArray<None> | NonEmptyArray<Some<SR>>> => {
              if (isAllNone(optionalResults)) {
                return Either_.right(optionalResults);
              }
              if (isAllSome(optionalResults)) {
                return Either_.right(optionalResults);
              }
              return Either_.left(existenceChange());
            },
          ),
          Either_.map(nonEmptyArray.sequence(option)),
          Either_.map(
            Option_.map(
              (subResults: Results<SR>): SR => {
                return reduceSubResults(subResults);
              },
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

// Dict<T, Either<E, Dict<I, SR>>>
// NonEmpty<Arr<T, Either<E, Dict<I, SR>>>>
// Arr<NonEmpty<>>

/*

export const search = <T extends Terms<any>, I extends Id<any>, E extends Err<any>, SR extends Result<any>>(
  reduceSubResults: ResultReducer<SR>,
  matchChange: Lazy<E>,
) => (results: Results<SearchResult<SR, T, I, E>>): SearchResult<SR, T, I, E> =>
  pipe(
    results,
    Dict_.mergeSymmetric(
      (variants: NonEmptyArray<Either<E, Dict<I, SR>>>): Either<E, Dict<I, SR>> => pipe(
        variants,
        nonEmptyArray.sequence(either),
        (x: Either<E, NonEmptyArray<Dict<I, SR>>>) => x,
        Either_.chain(
          (
            optionalResults: NonEmptyArray<Dict<I, SR>>,
          ): Either<E, NonEmptyArray<Dict<I, SR>>> => {
            if (isAllNone(optionalResults)) {
              return Either_.right(optionalResults);
            }
            if (isAllSome(optionalResults)) {
              return Either_.right(optionalResults);
            }
            return Either_.left(existenceChange());
          },
        ),
        (x: Either<E, NonEmptyArray<Dict<I, SR>>>) => x,
        Either_.map((foo: NonEmptyArray<Dict<I, SR>>) => pipe(
          foo,
          Dict_.mergeSymmetric(reduceSubResults),
          (x: Option<Dict<I, SR>>) => x,
        )),
        (x: Either<E, Option<Dict<I, SR>>>) => x,
        (x: Option<Either<E, Dict<I, SR>>>) => x,
      ),
    ),
    (x: Option<Dict<T, Either<E, Dict<I, SR>>>>) => x,
    Option_.getOrElse(
      (): Dict<T, Either<E, Dict<I, SR>>> => {
        // eslint-disable-next-line fp/no-throw
        throw new Error('reduce error, ids results not symmetric');
      },
    ),
  );
*/

/*
    nonEmptyArray.sequence(array),
    Array_.map(
      (variants: NonEmptyArray<[T, Either<E, Dict<I, SR>>]>): Option<[T, Either<E, Dict<I, SR>>]> =>
        pipe(
          {
            k: pipe(
              variants,
              NonEmptyArray_.map(([k, _v]): T => k),
              reduceDuplicateKeys,
            ),
            v: pipe(  // TODO: reduce Ids
              variants,
              NonEmptyArray_.map(([_k, v]): Either<E, Dict<I, SR>> => v),
              reduceSearchValues,
              nonEmptyArray.sequence(either),
              (x: Either<E, Results<Dict<I, SR>>>) => x,
              Either_.chain(
                (
                  results: NonEmptyArray<Dict<I, SR>>,
                ): Either<E, NonEmptyArray<Dict<I, SR>>> => {
                  if (isAllNone(optionalResults)) {
                    return Either_.right(optionalResults);
                  }
                  if (isAllSome(optionalResults)) {
                    return Either_.right(optionalResults);
                  }
                  return Either_.left(matchChange());
                },
              ),
              (x: Either<E, Results<Dict<I, SR>>>) => x,
              Either_.map(nonEmptyArray.sequence(option)),
              Either_.map(
                Option_.map(
                  (subResults: Results<SR>): SR => {
                    return reduceSubResults(subResults);
                  },
                ),
              ),
              Option_.some,
            ),
          },
          (x: { k: Option<T>, v: Option<Either<E, Dict<I, SR>>> }) => x,
          sequenceS(option),
          Option_.map(({ k, v }) => [k, v]),
        ),
    ),
    (x: Array<Option<[T, Either<E, Dict<I, SR>>]>>) => x,
    array.sequence(option),
*/

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
