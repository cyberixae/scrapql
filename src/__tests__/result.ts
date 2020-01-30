import { Task } from 'fp-ts/lib/Task';
import { Either } from 'fp-ts/lib/Either';
import * as Either_ from 'fp-ts/lib/Either';
import { Option } from 'fp-ts/lib/Option';
import * as Option_ from 'fp-ts/lib/Option';

import { name, version } from '../../package.json';

import { Ctx, Ctx0, ctx, ctx0 } from '../scrapql';
import * as scrapql from '../scrapql';

import { Dict, dict } from '../dict';

interface Logger<R, A extends Array<any>> {
  (...a: A): R;
  mock: any;
}
interface LoggerTask<R, A extends Array<any>> {
  (...a: A): Task<R>;
  mock: any;
}

function loggerTask<R, A extends Array<any>>(logger: Logger<R, A>): LoggerTask<R, A> {
  const lt: LoggerTask<R, A> = (...largs) => () => {
    return Promise.resolve(logger(...largs));
  };
  // eslint-disable-next-line fp/no-mutation
  lt.mock = logger.mock;
  return lt;
}

describe('result', () => {
  type Reporters = scrapql.Reporters<{
    learnProperty1Existence: (
      r: Either<Err1, scrapql.Existence>,
      c: Ctx<Id>,
    ) => Task<void>;
    receiveKeyResult: (r: KeyResult, c: Ctx<Key, Ctx<Id>>) => Task<void>;
    receiveProperty2Result: (r: Property2Result, c: Ctx0) => Task<void>;
  }>;

  function createReporters(): Reporters {
    return {
      learnProperty1Existence: loggerTask(
        jest.fn((_0: Either<Err1, scrapql.Existence>, _1: Ctx<Id>) => undefined),
      ),
      receiveKeyResult: loggerTask(
        jest.fn((_0: KeyResult, _1: Ctx<Key, Ctx<Id>>) => undefined),
      ),
      receiveProperty2Result: loggerTask(
        jest.fn((_0: Property2Result, _1: Ctx0) => undefined),
      ),
    };
  }

  type CustomRP<R, C extends scrapql.Context> = scrapql.ResultProcessor<R, Reporters, C>;

  const RESULT = `${name}/${version}/scrapql/test/result`;

  type Err1 = 'error';

  type Id = string & ('id1' | 'id2');
  const id1: Id = 'id1';
  const id2: Id = 'id2';
  type Key = string;
  const key1: Key = 'key1';

  type KeyResult = string;
  const key1Result: KeyResult = 'result1';
  const processKey: CustomRP<KeyResult, Ctx<Key, Ctx<Id>>> = scrapql.process.result.leaf(
    (r) => r.receiveKeyResult,
  );

  it('processKey', async () => {
    const reporters = createReporters();
    const context: Ctx<Key, Ctx<Id>> = ctx(key1, ctx(id1));
    const main = scrapql.processorInstance(processKey, reporters, context)(key1Result);
    await main();
    expect((reporters.learnProperty1Existence as any).mock.calls).toMatchObject([]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([
      [key1Result, ctx(key1, ctx(id1))],
    ]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([]);
  });

  type KeysResult = Dict<Key, KeyResult>;
  const keysResult: KeysResult = dict([key1, key1Result]);
  const processKeys: CustomRP<KeysResult, Ctx<Id>> = scrapql.process.result.keys(
    processKey,
  );

  it('processKeys', async () => {
    const reporters = createReporters();
    const context: Ctx<Id> = ctx(id1);
    const main = scrapql.processorInstance(processKeys, reporters, context)(keysResult);
    await main();
    expect((reporters.learnProperty1Existence as any).mock.calls).toMatchObject([]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([
      [key1Result, ctx(key1, ctx(id1))],
    ]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([]);
  });

  type Property1Result = Dict<Id, Either<Err1, Option<KeysResult>>>;
  const property1Result: Property1Result = dict(
    [id1, Either_.right(Option_.some(keysResult))],
    [id2, Either_.right(Option_.none)],
  );
  const processProperty1: CustomRP<Property1Result, Ctx0> = scrapql.process.result.ids<
    Reporters,
    Property1Result,
    Id,
    KeysResult,
    Ctx0,
    Err1
  >((r) => r.learnProperty1Existence, processKeys);

  it('processProperty1', async () => {
    const reporters = createReporters();
    const context: Ctx0 = ctx0;
    const main = scrapql.processorInstance(processProperty1, reporters, context)(
      property1Result,
    );
    await main();
    // eslint-disable-next-line fp/no-mutating-methods
    expect((reporters.learnProperty1Existence as any).mock.calls.sort()).toMatchObject([
      [Either_.right(true), ctx(id1)],
      [Either_.right(false), ctx(id2)],
    ]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([
      [key1Result, ctx(key1, ctx(id1))],
    ]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([]);
  });

  type Property2Result = string;
  const property2Result: Property2Result = 'result2';
  const processProperty2: CustomRP<Property2Result, Ctx0> = scrapql.process.result.leaf(
    (r) => r.receiveProperty2Result,
  );

  it('processProperty2', async () => {
    const reporters = createReporters();
    const context: Ctx0 = ctx0;
    const main = scrapql.processorInstance(processProperty2, reporters, context)(
      property2Result,
    );
    await main();
    expect((reporters.learnProperty1Existence as any).mock.calls).toMatchObject([]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([
      [property2Result, ctx0],
    ]);
  });

  type RootResult = Partial<{
    protocol: typeof RESULT;
    property1: Property1Result;
    property2: Property2Result;
  }>;
  const rootResult: RootResult = {
    protocol: RESULT,
    property1: property1Result,
  };

  it('processRoot (composed)', async () => {
    const processRoot: CustomRP<RootResult, Ctx0> = scrapql.process.result.properties<
      Reporters,
      RootResult,
      Ctx0
    >({
      protocol: scrapql.process.result.literal(),
      property1: processProperty1,
      property2: processProperty2,
    });
    const reporters = createReporters();
    const context: Ctx0 = ctx0;
    const main = scrapql.processorInstance(processRoot, reporters, context)(rootResult);
    await main();
    // eslint-disable-next-line fp/no-mutating-methods
    expect((reporters.learnProperty1Existence as any).mock.calls.sort()).toMatchObject([
      [Either_.right(true), ctx(id1)],
      [Either_.right(false), ctx(id2)],
    ]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([
      [key1Result, ctx(key1, ctx(id1))],
    ]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([]);
  });

  it('processRoot (standalone)', async () => {
    const processRoot = scrapql.process.result.properties<Reporters, RootResult, Ctx0>({
      protocol: scrapql.process.result.literal(),
      property1: scrapql.process.result.ids<
        Reporters,
        Property1Result,
        Id,
        KeysResult,
        Ctx0,
        Err1
      >(
        (r: Reporters) => r.learnProperty1Existence,
        scrapql.process.result.keys<Reporters, KeysResult, Key, KeyResult, Ctx<Id>>(
          scrapql.process.result.leaf<Reporters, KeyResult, Ctx<Key, Ctx<Id>>>(
            (r: Reporters) => r.receiveKeyResult,
          ),
        ),
      ),
      property2: scrapql.process.result.leaf((r: Reporters) => r.receiveProperty2Result),
    });
    const reporters = createReporters();
    const context: Ctx0 = ctx0;
    const main = scrapql.processorInstance(processRoot, reporters, context)(rootResult);
    await main();
    // eslint-disable-next-line fp/no-mutating-methods
    expect((reporters.learnProperty1Existence as any).mock.calls.sort()).toMatchObject([
      [Either_.right(true), ctx(id1)],
      [Either_.right(false), ctx(id2)],
    ]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([
      [key1Result, ctx(key1, ctx(id1))],
    ]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([]);
  });
});
