import { Task } from 'fp-ts/lib/Task';
import * as Task_ from 'fp-ts/lib/Task';
import { Option } from 'fp-ts/lib/Option';
import * as Option_ from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

import * as processQuery from '../query';
import { QueryProcessorFactory } from '../query';

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

/*
  const nopResolvers = Symbol('resolvers');
  const nopProcessor = (...rargs: any) => Task_.of(undefined);
  const nopProcessorFactory = () => nopProcessor;
  const ctx2 = 'ctx2';
  const ctx1 = 'ctx1';
  const exampleContext = [ctx2, ctx1];

  describe('literal processor', () => {
    const result = Symbol('result');
    const query: unknown = undefined;
    const processor = processQuery.literal(result)(nopResolvers);
    it('should return the predetermined result', async () => {
      const main = processor(query, ...exampleContext);
      const got = await main();
      expect(got).toEqual(result);
    });
  });

  describe('leaf processor', () => {
    const result = Symbol('result');
    const resolvers = {
      resolveQuery: loggerTask(jest.fn((...largs: any) => result)),
    };
    const query = true;
    const processor = processQuery.leaf((r: typeof resolvers) => r.resolveQuery)(resolvers);
    it('should call sub query resolver and return the result', async () => {
      const main = processor(query, ...exampleContext);
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
      jest.fn((query: KeysQuery, key: keyof KeysQuery, ...exampleContext) => results[key]),
    );
    const subProcessorFactory = jest.fn(() => subProcessor);
    const processor = processQuery.keys(subProcessorFactory)(nopResolvers);

    it('should call sub query processor for each query and return the results', async () => {
      const main = processor(queries, ...exampleContext);
      const got = await main();
      expect(subProcessorFactory.mock.calls).toContainEqual([nopResolvers]);
      expect(subProcessor.mock.calls).toContainEqual([query1, 'key1', ctx2, ctx1]);
      expect(subProcessor.mock.calls).toContainEqual([query2, 'key2', ctx2, ctx1]);
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
      jest.fn((query: IdsQuery, id: keyof IdsQuery, ...exampleContext) =>
        pipe(
          results[id],
          Option_.getOrElse(() => null),
        ),
      ),
    );
    const subProcessorFactory = jest.fn(() => subProcessor);

    it('should call existence check for each query', async () => {
      const processor = processQuery.ids((r: typeof resolvers) => r.existence, nopProcessorFactory)(resolvers);
      const main = processor(queries, ...exampleContext);
      await main();
      expect(resolvers.existence.mock.calls).toContainEqual(['id1']);
      expect(resolvers.existence.mock.calls).toContainEqual(['id2']);
      expect(resolvers.existence.mock.calls).toHaveLength(Object.keys(queries).length);
    });

    it('should call sub query processor for some queries', async () => {
      const processor = processQuery.ids((r: typeof resolvers) => r.existence, subProcessorFactory)(resolvers);
      const main = processor(queries, ...exampleContext);
      const got = await main();
      expect(subProcessorFactory.mock.calls).toMatchObject([[resolvers]]);
      expect(subProcessor.mock.calls).toMatchObject([[query1, 'id1', ctx2, ctx1]]);
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
    const factory1 = jest.fn(() => processor1);
    const factory2 = jest.fn(() => processor2);

    const processor = processQuery.properties({
      property1: factory1,
      property2: factory2,
    })(nopResolvers);

    it('should call other query processors based on present properties', async () => {
      const main = processor(queries, ...exampleContext);
      const got = await main();
      expect(factory1.mock.calls).toMatchObject([[nopResolvers]]);
      expect(factory2.mock.calls).toMatchObject([]);
      expect(processor1.mock.calls).toMatchObject([[query1, ctx2, ctx1]]);
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
      fetchData2: loggerTask(jest.fn((...largs: any) => null)),
    };

    const processor = processQuery.properties({
      property1: processQuery.ids(
        (r: typeof resolvers) => r.checkExistence,
        processQuery.keys(
          processQuery.leaf((r: typeof resolvers) => r.fetchData)
        ),
      ),
      property2: processQuery.leaf((r: typeof resolvers) => r.fetchData2)
    })(resolvers);

    it('should call stuff', async () => {
      const main = processor(query);
      const got = await main();
      expect(resolvers.checkExistence.mock.calls).toMatchObject([['id1'], ['id2']]);
      expect(resolvers.fetchData.mock.calls).toMatchObject([['key1', 'id1']]);
      expect(got).toMatchObject(results);
    });
  });

*/

  describe('processor combination explicit', () => {

    const resolvers = {
      checkExistence: loggerTask(jest.fn((id: string) => Option_.isSome(property1Result[id]))),
      fetchData: loggerTask(jest.fn((...largs: any) => key1Result)),
      fetchData2: loggerTask(jest.fn((...largs: any) => property2Result)),
    };
    type QPF<Q, R> = QueryProcessorFactory<typeof resolvers, Q, R>

    type Id = string;
    type Key = string;

    type KeyQuery = true;
    const key1Query: KeyQuery = true;
    type KeyResult = string;
    const key1Result: KeyResult = 'result1';
    const processKey: QPF<KeyQuery, KeyResult> = processQuery.leaf((r: typeof resolvers) => r.fetchData);

    it('processKey', async () => {
      await processKey(resolvers)(key1Query)();
    });

    type KeysQuery = Record<Key, KeyQuery>;
    const keysQuery1: KeysQuery = {
      key1: key1Query,
    };
    type KeysResult = Record<Key, KeyResult>; 
    const keysResult: KeysResult = {
      key1: key1Result,
    };
    const processKeys: QPF<KeysQuery,KeysResult> = processQuery.keys(processKey);

    it('processKeys', async () => {
      await processKeys(resolvers)(keysQuery1)();
    });

    type Property1Query = Record<Id, KeysQuery>
    const property1Query: Property1Query = {
      id1: keysQuery1,
      id2: keysQuery1,
    };
    type Property1Result = Record<Id, Option<KeysResult>>
    const property1Result: Property1Result = {
      id1: Option_.some(keysResult),
      id2: Option_.none,
    };
    const processProperty1: QPF<Property1Query, Property1Result> = processQuery.ids(
      (r: typeof resolvers) => r.checkExistence,
      processKeys,
    );

    it('processProperty1', async () => {
      await processProperty1(resolvers)(property1Query)();
    });

    type Property2Query = true;
    const property2Query: Property2Query = true;
    type Property2Result = string;
    const property2Result: Property2Result = 'result2';
    const processProperty2: QPF<Property2Query, Property2Result> = processQuery.leaf((r: typeof resolvers) => r.fetchData2);

    it('processProperty2', async () => {
      await processProperty2(resolvers)(property2Query)();
    });

    type RootQuery = Partial<{
      property1: Property1Query
      property2: Property2Query
    }>;
    const rootQuery: RootQuery = {
      property1: property1Query,
    };
    type RootResult = Partial<{
      property1: Property1Result
      property2: Property2Result
    }>;
    const rootResult: RootResult = {
      property1: property1Result,
    };
    const processRoot: QPF<RootQuery, RootResult> = processQuery.properties({
      property1: processProperty1,
      property2: processProperty2,
    });
    it('processQuery', async () => {
      await processRoot(resolvers)(rootQuery)();
    });

    /*
    const processor = processQuery(reporters)
    it('should call stuff', async () => {
      const main = processor(result);
      await main();
      expect(reporters.learnExistence.mock.calls).toMatchObject([['id1', true], ['id2', false]]);
      expect(reporters.receiveData.mock.calls).toMatchObject([[key1Result, 'key1', 'id1']]);
    });

    it('should call stuff', async () => {
      const main = processor(query);
      const got = await main();
      expect(resolvers.checkExistence.mock.calls).toMatchObject([['id1'], ['id2']]);
      expect(resolvers.fetchData.mock.calls).toMatchObject([['key1', 'id1']]);
      expect(got).toMatchObject(results);
    });
    */

  });

});
