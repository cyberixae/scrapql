import { Prepend, Reverse } from 'typescript-tuple';
import { array } from 'fp-ts/lib/Array';
import * as Array_ from 'fp-ts/lib/Array';
import * as Foldable_ from 'fp-ts/lib/Foldable';
import * as Record_ from 'fp-ts/lib/Record';
import { Task, taskSeq } from 'fp-ts/lib/Task';
import * as Task_ from 'fp-ts/lib/Task';
import { Option } from 'fp-ts/lib/Option';
import * as Option_ from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { identity } from 'fp-ts/lib/function';

import * as Tuple_ from './tuple';
import { Build, ResultProcessor, Context } from './types';

// helper functions

export function literal<R, A, C extends Context>(): Build<ResultProcessor<R>, A, C> {
  return (_0) => (_1) => (r: R) => Task_.of(undefined);
}

// leaf result contains part of the payload

export type LeafReporterConnector<R, A, C extends Context> = (
  a: A,
) => (...a: Prepend<Reverse<C>, R>) => Task<void>;

export function leaf<R, A, C extends Context>(
  connect: LeafReporterConnector<R, A, C>,
): Build<ResultProcessor<R>, A, C> {
  return (reporters) => (context) => (result) => {
    const args = pipe(
      context,
      Tuple_.reverse,
      Tuple_.prepend(result),
    );
    return connect(reporters)(...args);
  };
}

// keys result contains data that always exists in database

export function keys<R extends Record<I, SR>, I extends string, SR, A, C extends Context>(
  subProcessor: Build<ResultProcessor<SR>, A, Prepend<C, I>>,
): Build<ResultProcessor<R>, A, C> {
  return (reporters: A) => (context: C) => (result: R) => {
    const tasks: Array<Task<void>> = pipe(
      result,
      Record_.mapWithIndex((key: I, subResult: SR) => {
        const subContext = pipe(
          context,
          Tuple_.prepend(key),
        );
        return subProcessor(reporters)(subContext)(subResult);
      }),
      Record_.toUnfoldable(array),
      Array_.map(([k, v]) => v),
    );
    return Foldable_.traverse_(taskSeq, array)(tasks, identity);
  };
}

// ids result contains data that may not exist in database

export type ExistenceReporterConnector<A> = (
  a: A,
) => (i: string, b: boolean) => Task<void>;

export function ids<
  A,
  R extends Record<I, Option<SR>>,
  I extends string,
  SR,
  C extends Context
>(
  connect: ExistenceReporterConnector<A>,
  subProcessor: Build<ResultProcessor<SR>, A, Prepend<C, I>>,
): Build<ResultProcessor<R>, A, C> {
  return (reporters: A) => (context: C) => (result: R) => {
    const tasks: Array<Task<void>> = pipe(
      result,
      Record_.mapWithIndex((id: I, maybeSubResult: Option<SR>) => {
        const subContext = pipe(
          context,
          Tuple_.prepend(id),
        );
        return pipe(
          maybeSubResult,
          Option_.fold(
            () => [connect(reporters)(id, false)],
            (subResult) => [
              connect(reporters)(id, true),
              subProcessor(reporters)(subContext)(subResult),
            ],
          ),
        );
      }),
      Record_.toUnfoldable(array),
      Array_.map(([k, v]) => v),
      Array_.flatten,
    );
    return Foldable_.traverse_(taskSeq, array)(tasks, identity);
  };
}

// properties result contains results for a set of optional queries

export type ResultProcessorBuilderMapping<R, A, C extends Context> = {
  [I in keyof Required<R>]: Build<ResultProcessor<Required<R>[I]>, A, C>;
};

export function properties<R, A, C extends Context>(
  processors: ResultProcessorBuilderMapping<R, A, C>,
): Build<ResultProcessor<R>, A, C> {
  return (reporters: A) => (context: C) => <P extends string & keyof R>(
    result: R,
  ): Task<void> => {
    const taskRecord: Record<P, Task<void>> = pipe(
      result,
      Record_.mapWithIndex((property, subResult: R[P]) => {
        const processor = processors[property];
        return processor(reporters)(context)(subResult);
      }),
    );
    const tasks: Array<Task<void>> = pipe(
      taskRecord,
      Record_.toUnfoldable(array),
      Array_.map(([k, v]) => v),
    );
    return Foldable_.traverse_(taskSeq, array)(tasks, identity);
  };
}
