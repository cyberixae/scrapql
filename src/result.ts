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

function replace(v: Task<void>) {
  return <R>(r: R): Task<R> => Task_.of(r);
}


// all processors share these generic processor types

export type Context = Array<string>;
export type ResultProcessor<R> = (r: R, ...c: Context) => Task<R>;
export type ResultProcessorFactory<A, R> = (a: A) => ResultProcessor<R>;

// helper functions

export function literal(): ResultProcessorFactory<unknown, unknown> {
  return (_0) => (r, ..._99) => replace(Task_.of(undefined))(r);
}

// leaf result contains part of the payload

export type LeafReporterConnector<A, R> = (a: A) => (r: R, ...c: Context) => Task<void>;

export function leaf<A, R>(connect: LeafReporterConnector<A, R>): ResultProcessorFactory<A, R> {
  return (reporters) => (result, ...context) => replace(connect(reporters)(result, ...context))(result);
}

// keys result contains data that always exists in database

export function keys<A, R extends Record<I, SR>, I extends string, SR>(
  subProcessor: ResultProcessorFactory<A, SR>,
): ResultProcessorFactory<A, R> {
  return (reporters: A) => (result: R, ...context: Context) => {
    const tasks: Array<Task<SR>> = pipe(
      result,
      Record_.mapWithIndex((key: I, subResult: SR) => subProcessor(reporters)(subResult, key, ...context)),
      Record_.toUnfoldable(array),
      Array_.map(([k, v]) => v),
    );
    const v: Task<void> = Foldable_.traverse_(taskSeq, array)(tasks, identity)
    return replace(v)(result);
  };
}

// ids result contains data that may not exist in database

export type ExistenceReporterConnector<A> = (a: A) => (i: string, b: boolean) => Task<void>;

export function ids<A, R extends Record<I, Option<SR>>, I extends string, SR>(
  connect: ExistenceReporterConnector<A>,
  subProcessor: ResultProcessorFactory<A, SR>,
): ResultProcessorFactory<A, R> {
  return (reporters: A) => (result: R, ...context: Context) => {
    const tasks: Array<Task<SR|void>> = pipe(
      result,
      Record_.mapWithIndex((id: I, maybeSubResult: Option<SR>) => {
        return pipe(
          maybeSubResult,
          Option_.fold(
            () => [connect(reporters)(id, false)],
            (subResult) => [connect(reporters)(id, true), subProcessor(reporters)(subResult, id, ...context)],
          ),
        );
      }),
      Record_.toUnfoldable(array),
      Array_.map(([k, v]) => v),
      Array_.flatten,
    );
    const v: Task<void> = Foldable_.traverse_(taskSeq, array)(tasks, identity);
    return replace(v)(result);
  }
}

// properties result contains results for a set of optional queries

export type ResultProcessorFactoryMapping<A, R> = {[I in keyof Required<R>]: ResultProcessorFactory<A, Required<R>[I]>}

export function properties<A, R>(
  processors: ResultProcessorFactoryMapping<A, R>,
): ResultProcessorFactory<A, R> {
  return (reporters: A) => <P extends string & keyof R>(result: R, ...context: Context): Task<R> => {
    const taskRecord: Record<P, Task<Required<R>[P]>> = pipe(
      result,
      Record_.mapWithIndex((property, subResult: R[P]) => {
        const processor = processors[property];
        return processor(reporters)(subResult, ...context);
      }),
    );
    const tasks: Array<Task<Required<R>[P]>> = pipe(
      taskRecord,
      Record_.toUnfoldable(array),
      Array_.map(([k, v]) => v),
    );
    const v: Task<void> = Foldable_.traverse_(taskSeq, array)(tasks, identity);
    return replace(v)(result);
  };
}
