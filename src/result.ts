import { Prepend, Concat, Reverse } from 'typescript-tuple';
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
import {
  Build,
  Query,
  ResultProcessor,
  Context,
  ReporterConnector,
  ReporterAPI,
  ResultProcessorBuilderMapping,
  Key,
  Id,
  Property,
  LiteralQuery,
  LeafQuery,
  KeysQuery,
  ExistenceQuery,
  IdsQuery,
  PropertiesQuery,
  ActionableQuery,
} from './scrapql';

// helper functions

function reporterArgsFrom<R extends ActionableQuery['R'], C extends Context>(
  context: C,
  result: R,
): Concat<Reverse<C>, [R]> {
  return pipe(
    context,
    Tuple_.reverse,
    Tuple_.concat([result] as [R]),
  );
}

// literal result is known on forehand so we throw it away

export function literal<
  A extends ReporterAPI,
  R extends LiteralQuery['R'],
  C extends Context
>(): Build<ResultProcessor<R>, A, C> {
  return (_0: A) => (_1: C) => (_3: R) => Task_.of(undefined);
}

// leaf result contains part of the payload

export function leaf<A extends ReporterAPI, R extends LeafQuery['R'], C extends Context>(
  connect: ReporterConnector<A, R, C>,
): Build<ResultProcessor<R>, A, C> {
  return (reporters: A) => (context: C) => (result: R) => {
    return connect(reporters)(...reporterArgsFrom(context, result));
  };
}

// keys result contains data that always exists in database

export function keys<
  A extends ReporterAPI,
  R extends KeysQuery<K, SQ>['R'],
  K extends Key & keyof R,
  SQ extends Query,
  C extends Context
>(
  subProcessor: Build<ResultProcessor<SQ['R']>, A, Prepend<C, K>>,
): Build<ResultProcessor<R>, A, C> {
  return (reporters: A) => (context: C) => (result: R) => {
    const tasks: Array<Task<void>> = pipe(
      result,
      Record_.mapWithIndex((key: K, subResult: SQ['R']) => {
        const subContext = pipe(
          context,
          Tuple_.prepend(key),
        );
        return subProcessor(reporters)(subContext)(subResult);
      }),
      Record_.toUnfoldable(array),
      Array_.map(([_k, v]) => v),
    );
    return Foldable_.traverse_(taskSeq, array)(tasks, identity);
  };
}

// ids result contains data that may not exist in database

export function ids<
  A extends ReporterAPI,
  R extends IdsQuery<I, SQ>['R'],
  I extends Id & keyof R,
  SQ extends Query,
  C extends Context
>(
  connect: ReporterConnector<A, ExistenceQuery['R'], Prepend<C, I>>,
  subProcessor: Build<ResultProcessor<SQ['R']>, A, Prepend<C, I>>,
): Build<ResultProcessor<R>, A, C> {
  return (reporters: A) => (context: C) => (result: R) => {
    const tasks: Array<Task<void>> = pipe(
      result,
      Record_.mapWithIndex((id: I, maybeSubResult: Option<SQ['R']>) => {
        const subContext = pipe(
          context,
          Tuple_.prepend(id),
        );
        return pipe(
          maybeSubResult,
          Option_.fold(
            () => [connect(reporters)(...reporterArgsFrom(subContext, false))],
            (subResult) => [
              connect(reporters)(...reporterArgsFrom(subContext, true)),
              subProcessor(reporters)(subContext)(subResult),
            ],
          ),
        );
      }),
      Record_.toUnfoldable(array),
      Array_.map(([_k, v]) => v),
      Array_.flatten,
    );
    return Foldable_.traverse_(taskSeq, array)(tasks, identity);
  };
}

// properties result contains results for a set of optional queries

export function properties<
  A extends ReporterAPI,
  R extends PropertiesQuery['R'],
  C extends Context
>(processors: ResultProcessorBuilderMapping<A, R, C>): Build<ResultProcessor<R>, A, C> {
  return (reporters: A) => (context: C) => <P extends Property & keyof R>(
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
      Array_.map(([_k, v]) => v),
    );
    return Foldable_.traverse_(taskSeq, array)(tasks, identity);
  };
}
