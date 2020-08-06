import * as ruins from 'ruins-ts';
import { Task } from 'fp-ts/lib/Task';
import { Option } from 'fp-ts/lib/Option';
import * as Option_ from 'fp-ts/lib/Option';

import { name, version } from '../../package.json';

import { Dict, dict, Context, context } from '../scrapql';
import * as scrapql from '../scrapql';

type Logger<R, A extends Array<any>> = {
  (...a: A): R;
  mock: any;
};
type LoggerTask<R, A extends Array<any>> = {
  (...a: A): Task<R>;
  mock: any;
};

function loggerTask<R, A extends Array<any>>(logger: Logger<R, A>): LoggerTask<R, A> {
  const lt: LoggerTask<R, A> = (...largs) => () => {
    return Promise.resolve(logger(...largs));
  };
  // eslint-disable-next-line fp/no-mutation
  lt.mock = logger.mock;
  return lt;
}

describe('result', () => {
  type Reporters = {
    learnProperty1Existence: (r: scrapql.Existence, c: Context<[Id]>) => Task<void>;
    learnProperty3Match: (r: Array<Id>, c: Context<[Terms]>) => Task<void>;
    receiveKeyResult: (r: KeyResult, c: Context<[Key, Id]>) => Task<void>;
    receiveProperty2Result: (r: Property2Result, c: Context<[]>) => Task<void>;
  };

  function createReporters(): Reporters {
    return {
      learnProperty1Existence: loggerTask(
        jest.fn((_0: scrapql.Existence, _1: Context<[Id]>) => undefined),
      ),
      learnProperty3Match: loggerTask(
        jest.fn((_0: Array<Id>, _1: Context<[Terms]>) => undefined),
      ),
      receiveKeyResult: loggerTask(
        jest.fn((_0: KeyResult, _1: Context<[Key, Id]>) => undefined),
      ),
      receiveProperty2Result: loggerTask(
        jest.fn((_0: Property2Result, _1: Context<[]>) => undefined),
      ),
    };
  }

  type CustomRP<R, C extends scrapql.Context<any>> = scrapql.ResultProcessor<R, C, Reporters>;

  const RESULT = `${name}/${version}/scrapql/test/result`;

  type Id = string & ('id1' | 'id2');
  const id1: Id = 'id1';
  const id2: Id = 'id2';

  type Terms = {
    min: number;
    max: number;
  };
  const terms: Terms = {
    min: 0,
    max: 1,
  };

  type Key = string;
  const key1: Key = 'key1';

  type KeyResult = string;
  const key1Result: KeyResult = 'result1';
  const processKey: CustomRP<KeyResult, Context<[Key, Id]>> = scrapql.leaf.processResult(
    (r) => r.receiveKeyResult,
  );

  it('processKey', async () => {
    const reporters = createReporters();
    const ctx: Context<[Key, Id]> = context(key1, id1);
    const main = scrapql.processorInstance(processKey, ctx, reporters)(key1Result);
    await ruins.fromTask(main);
    expect((reporters.learnProperty1Existence as any).mock.calls).toMatchObject([]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([
      [key1Result, context(key1, id1)],
    ]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([]);
  });

  type KeysResult = Dict<Key, KeyResult>;
  const keysResult: KeysResult = dict([key1, key1Result]);
  const processKeys: CustomRP<KeysResult, Context<[Id]>> = scrapql.keys.processResult(
    processKey,
  );

  it('processKeys', async () => {
    const reporters = createReporters();
    const ctx: Context<[Id]> = context(id1);
    const main = scrapql.processorInstance(processKeys, ctx, reporters)(keysResult);
    await ruins.fromTask(main);
    expect((reporters.learnProperty1Existence as any).mock.calls).toMatchObject([]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([
      [key1Result, context(key1, id1)],
    ]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([]);
  });

  type Property1Result = Dict<Id, Option<KeysResult>>;
  const property1Result: Property1Result = dict(
    [id1, Option_.some(keysResult)],
    [id2, Option_.none],
  );
  const processProperty1: CustomRP<Property1Result, Context<[]>> = scrapql.ids.processResult<
    Property1Result,
    Context<[]>,
    Reporters,
    Id,
    KeysResult
  >((r) => r.learnProperty1Existence, processKeys);

  it('processProperty1', async () => {
    const reporters = createReporters();
    const ctx: Context<[]> = context();
    const main = scrapql.processorInstance(
      processProperty1,
      ctx,
      reporters,
    )(property1Result);
    await ruins.fromTask(main);
    // eslint-disable-next-line fp/no-mutating-methods
    expect((reporters.learnProperty1Existence as any).mock.calls.sort()).toMatchObject([
      [false, context(id2)],
      [true, context(id1)],
    ]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([
      [key1Result, context(key1, id1)],
    ]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([]);
  });

  type Property2Result = string;
  const property2Result: Property2Result = 'result2';
  const processProperty2: CustomRP<Property2Result, Context<[]>> = scrapql.leaf.processResult(
    (r) => r.receiveProperty2Result,
  );

  it('processProperty2', async () => {
    const reporters = createReporters();
    const ctx: Context<[]> = context();
    const main = scrapql.processorInstance(
      processProperty2,
      ctx,
      reporters,
    )(property2Result);
    await ruins.fromTask(main);
    expect((reporters.learnProperty1Existence as any).mock.calls).toMatchObject([]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([
      [property2Result, context()],
    ]);
  });

  type Property3Result = Dict<Terms, Dict<Id, KeysResult>>;
  const property3Result: Property3Result = dict([terms, dict([id1, keysResult])]);
  const processProperty3: CustomRP<Property3Result, Context<[]>> = scrapql.search.processResult<
    Property3Result,
    Context<[]>,
    Reporters,
    Terms,
    Id,
    KeysResult
  >((r) => r.learnProperty3Match, processKeys);

  it('processProperty3', async () => {
    const reporters = createReporters();
    const ctx: Context<[]> = context();
    const main = scrapql.processorInstance(
      processProperty3,
      ctx,
      reporters,
    )(property3Result);
    await ruins.fromTask(main);
    // eslint-disable-next-line fp/no-mutating-methods
    expect((reporters.learnProperty3Match as any).mock.calls.sort()).toMatchObject([
      [[id1], context(terms)],
    ]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([
      [key1Result, context(key1, id1)],
    ]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([]);
  });

  type RootResult = Partial<{
    protocol: typeof RESULT;
    property1: Property1Result;
    property2: Property2Result;
    property3: Property3Result;
  }>;
  const rootResult: RootResult = {
    protocol: RESULT,
    property1: property1Result,
    property3: property3Result,
  };

  it('processRoot (composed)', async () => {
    const processRoot: CustomRP<RootResult, Context<[]>> = scrapql.properties.processResult<
      RootResult,
      Context<[]>,
      Reporters
    >({
      protocol: scrapql.literal.processResult(),
      property1: processProperty1,
      property2: processProperty2,
      property3: processProperty3,
    });
    const reporters = createReporters();
    const ctx: Context<[]> = context();
    const main = scrapql.processorInstance(processRoot, ctx, reporters)(rootResult);
    await ruins.fromTask(main);
    // eslint-disable-next-line fp/no-mutating-methods
    expect((reporters.learnProperty1Existence as any).mock.calls.sort()).toMatchObject([
      [false, context(id2)],
      [true, context(id1)],
    ]);
    // eslint-disable-next-line fp/no-mutating-methods
    expect((reporters.learnProperty3Match as any).mock.calls.sort()).toMatchObject([
      [[id1], context(terms)],
    ]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([
      [key1Result, context(key1, id1)],
      [key1Result, context(key1, id1)],
    ]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([]);
  });

  it('processRoot (standalone)', async () => {
    const processRoot = scrapql.properties.processResult<RootResult, Context<[]>, Reporters>({
      protocol: scrapql.literal.processResult(),
      property1: scrapql.ids.processResult<
        Property1Result,
        Context<[]>,
        Reporters,
        Id,
        KeysResult
      >(
        (r: Reporters) => r.learnProperty1Existence,
        scrapql.keys.processResult<KeysResult, Context<[Id]>, Reporters, Key, KeyResult>(
          scrapql.leaf.processResult<KeyResult, Context<[Key, Id]>, Reporters>(
            (r: Reporters) => r.receiveKeyResult,
          ),
        ),
      ),
      property2: scrapql.leaf.processResult((r: Reporters) => r.receiveProperty2Result),
      property3: scrapql.search.processResult<
        Property3Result,
        Context<[]>,
        Reporters,
        Terms,
        Id,
        KeysResult
      >(
        (r) => r.learnProperty3Match,
        scrapql.keys.processResult<KeysResult, Context<[Id]>, Reporters, Key, KeyResult>(
          scrapql.leaf.processResult<KeyResult, Context<[Key, Id]>, Reporters>(
            (r: Reporters) => r.receiveKeyResult,
          ),
        ),
      ),
    });
    const reporters = createReporters();
    const ctx: Context<[]> = context();
    const main = scrapql.processorInstance(processRoot, ctx, reporters)(rootResult);
    await ruins.fromTask(main);
    // eslint-disable-next-line fp/no-mutating-methods
    expect((reporters.learnProperty1Existence as any).mock.calls.sort()).toMatchObject([
      [false, context(id2)],
      [true, context(id1)],
    ]);
    // eslint-disable-next-line fp/no-mutating-methods
    expect((reporters.learnProperty3Match as any).mock.calls.sort()).toMatchObject([
      [[id1], context(terms)],
    ]);
    expect((reporters.receiveKeyResult as any).mock.calls).toMatchObject([
      [key1Result, context(key1, id1)],
      [key1Result, context(key1, id1)],
    ]);
    expect((reporters.receiveProperty2Result as any).mock.calls).toMatchObject([]);
  });
});
