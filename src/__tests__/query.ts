import * as ruins from 'ruins-ts';
import { Task } from 'fp-ts/lib/Task';
import { TaskEither } from 'fp-ts/lib/TaskEither';
import { Either } from 'fp-ts/lib/Either';
import * as Either_ from 'fp-ts/lib/Either';
import { Option } from 'fp-ts/lib/Option';
import * as Option_ from 'fp-ts/lib/Option';
import * as Array_ from 'fp-ts/lib/Array';
import { flow } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import { name, version } from '../../package.json';

import { Dict, dict, Context, context } from '../scrapql';
import * as scrapql from '../scrapql';

import * as Dict_ from '../utils/dict';

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

describe('query', () => {
  /* eslint-disable @typescript-eslint/no-use-before-define */

  type Resolvers = {
    checkProperty1Existence: (q: Id) => TaskEither<Err1, scrapql.Existence>;
    resolveProperty3Terms: (q: Terms) => TaskEither<Err1, Array<Id>>;
    fetchKeyResult: (q: KeyQuery, c: Context<[Key, Id]>) => TaskEither<Err1, KeyResult>;
    fetchProperty2Result: (
      q: Property2Query,
      c: Context<[]>,
    ) => TaskEither<Err1, Property2Result>;
  };

  function createResolvers(): Resolvers {
    return {
      checkProperty1Existence: loggerTask(
        jest.fn((id: Id) =>
          pipe(
            property1Result,
            Dict_.lookup(id),
            Either_.fromOption((): Err1 => err1),
            Either_.map(Option_.isSome),
          ),
        ),
      ),
      resolveProperty3Terms: loggerTask(
        jest.fn(
          ({ min, max }: Terms): Either<Err1, Array<Id>> =>
            pipe(
              Dict_.keys(property1Result),
              Array_.filter(
                flow(
                  (i: Id): number => parseInt(i.slice(2), 10),
                  (no: number) => no >= min && no <= max,
                ),
              ),
              Either_.right,
              (x: Either<Err1, Array<Id>>) => x,
            ),
        ),
      ),
      fetchKeyResult: loggerTask(
        jest.fn((_0: KeyQuery, _1: Context<[Key, Id]>) => Either_.right(key1Result)),
      ),
      fetchProperty2Result: loggerTask(
        jest.fn((_0: Property2Query, _1: Context<[]>) => Either_.right(property2Result)),
      ),
    };
  }

  type CustomQP<Q, R, C extends scrapql.Context<any>> = scrapql.QueryProcessor<
    Q,
    R,
    Err1,
    C,
    Resolvers
  >;

  const QUERY = `${name}/${version}/scrapql/test/query`;
  const RESULT = `${name}/${version}/scrapql/test/result`;

  type Err1 = 'error';
  const err1: Err1 = 'error';

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
  type KeyQuery = string;
  const key1Result: KeyResult = 'result1';
  const key1Query: KeyQuery = 'query1';
  const processKey: CustomQP<
    KeyQuery,
    KeyResult,
    Context<[Key, Id]>
  > = scrapql.leaf.processQuery((r) => r.fetchKeyResult);

  it('processKey', async () => {
    const resolvers = createResolvers();
    const ctx: Context<[Key, Id]> = context(key1, id1);
    const main = scrapql.processorInstance(processKey, ctx, resolvers)(key1Query);
    const result = await ruins.fromTaskEither(main);
    expect((resolvers.checkProperty1Existence as any).mock.calls).toMatchObject([]);
    expect((resolvers.fetchKeyResult as any).mock.calls).toMatchObject([
      [key1Query, context(key1, id1)],
    ]);
    expect((resolvers.fetchProperty2Result as any).mock.calls).toMatchObject([]);
    expect(result).toEqual(key1Result);
  });

  type KeysResult = Dict<Key, KeyResult>;
  type KeysQuery = Dict<Key, KeyQuery>;
  const keysResult: KeysResult = dict([key1, key1Result]);
  const keysQuery: KeysQuery = dict([key1, key1Query]);
  const processKeys: CustomQP<KeysQuery, KeysResult, Context<[Id]>> = scrapql.keys.processQuery(
    processKey,
  );

  it('processKeys', async () => {
    const resolvers = createResolvers();
    const ctx: Context<[Id]> = context(id1);
    const main = scrapql.processorInstance(processKeys, ctx, resolvers)(keysQuery);
    const result = await ruins.fromTaskEither(main);
    expect((resolvers.checkProperty1Existence as any).mock.calls).toMatchObject([]);
    expect((resolvers.fetchKeyResult as any).mock.calls).toMatchObject([
      [key1Query, context(key1, id1)],
    ]);
    expect((resolvers.fetchProperty2Result as any).mock.calls).toMatchObject([]);
    expect(result).toEqual(keysResult);
  });

  type Property1Result = Dict<Id, Option<KeysResult>>;
  type Property1Query = Dict<Id, KeysQuery>;
  const property1Result: Property1Result = dict(
    [id1, Option_.some(keysResult)],
    [id2, Option_.none],
  );
  const property1Query: Property1Query = [
    [id1, keysQuery],
    [id2, keysQuery],
  ];
  const processProperty1: CustomQP<
    Property1Query,
    Property1Result,
    Context<[]>
  > = scrapql.ids.processQuery((r) => r.checkProperty1Existence, processKeys);

  it('processProperty1', async () => {
    const resolvers = createResolvers();
    const ctx: Context<[]> = context();
    const main = scrapql.processorInstance(
      processProperty1,
      ctx,
      resolvers,
    )(property1Query);
    const result = await ruins.fromTaskEither(main);
    // eslint-disable-next-line fp/no-mutating-methods
    expect((resolvers.checkProperty1Existence as any).mock.calls.sort()).toMatchObject([
      [id1, context()],
      [id2, context()],
    ]);
    expect((resolvers.fetchKeyResult as any).mock.calls).toMatchObject([
      [key1Query, context(key1, id1)],
    ]);
    expect((resolvers.fetchProperty2Result as any).mock.calls).toMatchObject([]);
    expect(result).toEqual(property1Result);
  });

  type Property2Result = string;
  type Property2Query = string;
  const property2Result: Property2Result = 'result2';
  const property2Query: Property2Query = 'query2';
  const processProperty2: CustomQP<
    Property2Query,
    Property2Result,
    Context<[]>
  > = scrapql.leaf.processQuery((r) => r.fetchProperty2Result);

  it('processProperty2', async () => {
    const resolvers = createResolvers();
    const ctx: Context<[]> = context();
    const main = scrapql.processorInstance(
      processProperty2,
      ctx,
      resolvers,
    )(property2Query);
    const result = await ruins.fromTaskEither(main);
    expect((resolvers.checkProperty1Existence as any).mock.calls).toMatchObject([]);
    expect((resolvers.fetchKeyResult as any).mock.calls).toMatchObject([]);
    expect((resolvers.fetchProperty2Result as any).mock.calls).toMatchObject([
      [property2Query, context()],
    ]);
    expect(result).toEqual(property2Result);
  });

  type Property3Result = Dict<Terms, Dict<Id, KeysResult>>;
  type Property3Query = Dict<Terms, KeysQuery>;
  const property3Query: Property3Query = dict([terms, keysQuery]);
  const property3Result: Property3Result = dict([terms, dict([id1, keysResult])]);
  const processProperty3: CustomQP<
    Property3Query,
    Property3Result,
    Context<[]>
  > = scrapql.search.processQuery((r) => r.resolveProperty3Terms, processKeys);

  it('processProperty3', async () => {
    const resolvers = createResolvers();
    const ctx: Context<[]> = context();
    const main = scrapql.processorInstance(
      processProperty3,
      ctx,
      resolvers,
    )(property3Query);
    const result = await ruins.fromTaskEither(main);
    expect((resolvers.checkProperty1Existence as any).mock.calls).toMatchObject([]);
    expect((resolvers.resolveProperty3Terms as any).mock.calls).toMatchObject([
      [terms, context()],
    ]);
    expect((resolvers.fetchKeyResult as any).mock.calls).toMatchObject([
      [key1Query, context(key1, id1)],
    ]);
    expect(result).toEqual(property3Result);
  });

  type RootResult = Partial<{
    protocol: typeof RESULT;
    property1: Property1Result;
    property2: Property2Result;
    property3: Property3Result;
  }>;
  type RootQuery = Partial<{
    protocol: typeof QUERY;
    property1: Property1Query;
    property2: Property2Query;
    property3: Property3Query;
  }>;
  const rootResult: RootResult = {
    protocol: RESULT,
    property1: property1Result,
    property3: property3Result,
  };
  const rootQuery: RootQuery = {
    protocol: QUERY,
    property1: property1Query,
    property3: property3Query,
  };

  it('processRoot (composed)', async () => {
    const processRoot: CustomQP<
      RootQuery,
      RootResult,
      Context<[]>
    > = scrapql.properties.processQuery({
      protocol: scrapql.literal.processQuery(RESULT),
      property1: processProperty1,
      property2: processProperty2,
      property3: processProperty3,
    });

    const resolvers = createResolvers();
    const ctx: Context<[]> = context();
    const main = scrapql.processorInstance(processRoot, ctx, resolvers)(rootQuery);
    const result = await ruins.fromTaskEither(main);

    // eslint-disable-next-line fp/no-mutating-methods
    expect((resolvers.checkProperty1Existence as any).mock.calls.sort()).toMatchObject([
      [id1, context()],
      [id2, context()],
    ]);
    expect((resolvers.resolveProperty3Terms as any).mock.calls).toMatchObject([
      [terms, context()],
    ]);
    expect((resolvers.fetchKeyResult as any).mock.calls).toMatchObject([
      [key1Query, context(key1, id1)],
      [key1Query, context(key1, id1)],
    ]);
    expect((resolvers.fetchProperty2Result as any).mock.calls).toMatchObject([]);
    expect(result).toEqual(rootResult);
  });

  it('processRoot (standalone)', async () => {
    const processRoot = scrapql.properties.processQuery<
      RootQuery,
      Err1,
      Context<[]>,
      Resolvers,
      RootResult
    >({
      protocol: scrapql.literal.processQuery(RESULT),
      property1: scrapql.ids.processQuery(
        (r: Resolvers) => r.checkProperty1Existence,
        scrapql.keys.processQuery<
          KeysQuery,
          Err1,
          Context<[Id]>,
          Resolvers,
          Key,
          KeyQuery,
          KeyResult
        >(scrapql.leaf.processQuery((r: Resolvers) => r.fetchKeyResult)),
      ),
      property2: scrapql.leaf.processQuery((r: Resolvers) => r.fetchProperty2Result),
      property3: scrapql.search.processQuery(
        (r) => r.resolveProperty3Terms,
        scrapql.keys.processQuery<
          KeysQuery,
          Err1,
          Context<[Id]>,
          Resolvers,
          Key,
          KeyQuery,
          KeyResult
        >(scrapql.leaf.processQuery((r: Resolvers) => r.fetchKeyResult)),
      ),
    });

    const resolvers = createResolvers();
    const ctx: Context<[]> = context();
    const main = scrapql.processorInstance(processRoot, ctx, resolvers)(rootQuery);
    const result = await ruins.fromTaskEither(main);
    // eslint-disable-next-line fp/no-mutating-methods
    expect((resolvers.checkProperty1Existence as any).mock.calls.sort()).toMatchObject([
      [id1, context()],
      [id2, context()],
    ]);
    expect((resolvers.resolveProperty3Terms as any).mock.calls).toMatchObject([
      [terms, context()],
    ]);
    expect((resolvers.fetchKeyResult as any).mock.calls).toMatchObject([
      [key1Query, context(key1, id1)],
      [key1Query, context(key1, id1)],
    ]);
    expect((resolvers.fetchProperty2Result as any).mock.calls).toMatchObject([]);
    expect(result).toEqual(rootResult);
  });
});
