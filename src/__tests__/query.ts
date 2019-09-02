import { Task } from 'fp-ts/lib/Task';
import * as Task_ from 'fp-ts/lib/Task';
import * as Option_ from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

import * as processQuery from '../query';

interface Logger<R, A extends Array<any>> {
  (...a: A): R;
  mock: any;
}
interface LoggerTask<R, A extends Array<any>> {
  (...a: A): Task<R>;
  mock: any;
}

function loggerTask<R, A extends Array<any>>(logger: Logger<R, A>): LoggerTask<R, A> {
  const task: LoggerTask<R, A> = (...largs) => () => {
    return Promise.resolve(logger(...largs));
  };
  // eslint-disable-next-line fp/no-mutation
  task.mock = logger.mock;
  return task;
}

describe('query', () => {
  const nopResolver = (...rargs: any) => Task_.of(undefined);
  const nopResolvers = Symbol('resolvers');
  const ctx2 = 'ctx2';
  const ctx1 = 'ctx1';
  const exampleContext = [ctx2, ctx1];

  describe('leaf processor', () => {
    const result = Symbol('result');
    const resolvers = {
      resolveQuery: loggerTask(jest.fn((...largs: any) => result)),
    };
    const query = true;
    const processor = processQuery.leaf((r: typeof resolvers) => r.resolveQuery);
    it('should call sub query resolver and return the result', async () => {
      const main = processor(resolvers, query, ...exampleContext);
      const got = await main();
      expect(resolvers.resolveQuery.mock.calls).toMatchObject([[ctx2, ctx1]]);
      expect(got).toEqual(result);
    });
  });

  describe('keys processor', () => {
    const result1 = Symbol('result1');
    const result2 = Symbol('result2');
    const results: Record<string, any> = {
      key1: result1,
      key2: result2,
    };
    type KeysQuery = Record<string, any>;
    const query1 = Symbol('query1');
    const query2 = Symbol('query2');
    const queries: KeysQuery = {
      key1: query1,
      key2: query2,
    };
    const subProcessor = loggerTask(
      jest.fn((_0: unknown, query: KeysQuery, key: keyof KeysQuery, ...exampleContext) => results[key]),
    );
    const processor = processQuery.keys(subProcessor);

    it('should call sub query processor for each query and return the results', async () => {
      const main = processor(nopResolvers, queries, ...exampleContext);
      const got = await main();
      expect(subProcessor.mock.calls).toContainEqual([nopResolvers, query1, 'key1', ctx2, ctx1]);
      expect(subProcessor.mock.calls).toContainEqual([nopResolvers, query2, 'key2', ctx2, ctx1]);
      expect(subProcessor.mock.calls).toHaveLength(Object.keys(queries).length);
      expect(got).toMatchObject(results);
    });
  });

  describe('ids processor', () => {
    const result1 = Symbol('result1');
    const results: Record<string, any> = {
      id1: Option_.some(result1),
      id2: Option_.none,
    };
    type IdsQuery = Record<string, any>;
    const query1 = Symbol('query1');
    const query2 = Symbol('query2');
    const queries: IdsQuery = {
      id1: query1,
      id2: query2,
    };
    const resolvers = {
      existence: loggerTask(jest.fn((id: string) => Option_.isSome(results[id]))),
    };
    const subProcessor = loggerTask(
      jest.fn((_0: unknown, query: IdsQuery, id: keyof IdsQuery, ...exampleContext) =>
        pipe(
          results[id],
          Option_.getOrElse(() => null),
        ),
      ),
    );

    it('should call existence check for each query', async () => {
      const processor = processQuery.ids((r: typeof resolvers) => r.existence, nopResolver);
      const main = processor(resolvers, queries, ...exampleContext);
      await main();
      expect(resolvers.existence.mock.calls).toContainEqual(['id1']);
      expect(resolvers.existence.mock.calls).toContainEqual(['id2']);
      expect(resolvers.existence.mock.calls).toHaveLength(Object.keys(queries).length);
    });

    it('should call sub query processor for some queries', async () => {
      const processor = processQuery.ids((r: typeof resolvers) => r.existence, subProcessor);
      const main = processor(resolvers, queries, ...exampleContext);
      const got = await main();
      expect(subProcessor.mock.calls).toMatchObject([[resolvers, query1, 'id1', ctx2, ctx1]]);
      expect(got).toMatchObject(results);
    });
  });

  describe('properties processor', () => {
    const result1 = Symbol('result1');
    const result2 = Symbol('result2');
    type Result = Partial<{
      readonly property1: typeof result1;
      readonly property2: typeof result2;
    }>;
    const results: Result = {
      property1: result1,
    };
    const query1 = Symbol('query1');
    const query2 = Symbol('query2');
    type Query = Partial<{
      readonly property1: typeof query1;
      readonly property2: typeof query2;
    }>;
    const queries: Query = {
      property1: query1,
    };
    const processor1 = loggerTask(jest.fn((...largs: any): typeof result1 => result1));
    const processor2 = loggerTask(jest.fn((...largs: any): typeof result2 => result2));

    const processor = processQuery.properties({
      property1: processor1,
      property2: processor2,
    });

    it('should call other query processors based on present properties', async () => {
      const main = processor(nopResolvers, queries, ...exampleContext);
      const got = await main();
      expect(processor1.mock.calls).toMatchObject([[nopResolvers, query1, ctx2, ctx1]]);
      expect(processor2.mock.calls).toMatchObject([]);
      expect(got).toMatchObject(results);
    });
  });

  describe('processor combination', () => {

    const result1 = Symbol('result1');
    const items: Record<string, any> = {
      id1: Option_.some({
        key1: result1,
      }),
      id2: Option_.none,
    };
    const results = {
      property1: items,
    }

    const query = {
      property1: {
        id1: {
          key1: true,
        },
        id2: {
          key1: true,
        },
      },
    };

    const resolvers = {
      checkExistence: loggerTask(jest.fn((id: string) => Option_.isSome(items[id]))),
      fetchData: loggerTask(jest.fn((...largs: any) => result1)),
    };

    const processor = processQuery.properties({
      property1: processQuery.ids(
        (r: typeof resolvers) => r.checkExistence,
        processQuery.keys(
          processQuery.leaf((r: typeof resolvers) => r.fetchData)
        ),
      ),
    });

    it('should call stuff', async () => {
      const main = processor(resolvers, query);
      const got = await main();
      expect(resolvers.checkExistence.mock.calls).toMatchObject([['id1'], ['id2']]);
      expect(resolvers.fetchData.mock.calls).toMatchObject([['key1', 'id1']]);
      expect(got).toMatchObject(results);
    });
  });
});
