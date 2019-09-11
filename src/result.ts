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
  ProcessorBuilderMapping,
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

function reporterArgsFrom<Q extends ActionableQuery, C extends Context>(
  context: C,
  result: Q['R'],
): Concat<Reverse<C>, [Q['R']]> {
  return pipe(
    context,
    Tuple_.reverse,
    Tuple_.concat([result] as [Q['R']]),
  );
}

// literal result is known on forehand so we throw it away

export function literal<
  A extends ReporterAPI,
  Q extends LiteralQuery,
  C extends Context
>(): Build<ResultProcessor<Q>, A, C> {
  return (_0) => (_1) => (_3) => Task_.of(undefined);
}

// leaf result contains part of the payload

export function leaf<A extends ReporterAPI, Q extends LeafQuery, C extends Context>(
  connect: ReporterConnector<A, Q, C>,
): Build<ResultProcessor<Q>, A, C> {
  return (reporters: A) => (context: C) => (result: Q['R']) => {
    const reporter = connect(reporters);
    return reporter(...reporterArgsFrom(context, result));
  };
}

// keys result contains data that always exists in database

export function keys<
  A extends ReporterAPI,
  Q extends KeysQuery<K, SQ>,
  K extends Key & keyof Q,
  SQ extends Query,
  C extends Context
>(
  subProcessor: Build<ResultProcessor<SQ>, A, Prepend<C, K>>,
): Build<ResultProcessor<Q>, A, C> {
  return (reporters: A) => (context: C) => (result: Q['R']) => {
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
  Q extends IdsQuery<I, SQ>,
  I extends Id & keyof Q,
  SQ extends Query,
  C extends Context
>(
  connect: ReporterConnector<A, ExistenceQuery, Prepend<C, I>>,
  subProcessor: Build<ResultProcessor<SQ>, A, Prepend<C, I>>,
): Build<ResultProcessor<Q>, A, C> {
  return (reporters: A) => (context: C) => (result: Q['R']) => {
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
  Q extends PropertiesQuery,
  C extends Context
>(processors: ProcessorBuilderMapping<A, Q, C>): Build<ResultProcessor<Q>, A, C> {
  return (reporters: A) => (context: C) => <P extends Property & keyof Q>(
    result: Q['R'],
  ): Task<void> => {
    const taskRecord: Record<P, Task<void>> = pipe(
      result,
      Record_.mapWithIndex((property, subResult: Q['R'][P]) => {
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
