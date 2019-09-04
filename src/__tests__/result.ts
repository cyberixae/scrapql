import { Task } from 'fp-ts/lib/Task';
import * as Task_ from 'fp-ts/lib/Task';
import * as Option_ from 'fp-ts/lib/Option';
import { Option } from 'fp-ts/lib/Option';

import * as processResult from '../result';
import { ResultProcessorFactory } from '../result';

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

describe('result', () => {

/*

  //const nopReporter = (...rargs: any) => Task_.of(undefined);
  //const nopProcessor = (...rargs: any) => Task_.of(undefined);
  //const nopProcessorFactory = () => nopProcessor;
  const nopReporters = Symbol('reporters');
  const ctx2 = 'ctx2';
  const ctx1 = 'ctx1';
  const exampleContext = [ctx2, ctx1];

  describe('literal processor', () => {
    const result: unknown = undefined;
    const processor = processResult.literal()(nopReporters);
    it('should ignore result literal', async () => {
      const main = processor(result, ...exampleContext);
      await main();
    });
  });

  describe('leaf processor', () => {
    const reporters = {
      reportResult: loggerTask(jest.fn((...largs: any): void => undefined)),
    };
    const result = Symbol('result');
    const processor = processResult.leaf((r: typeof reporters) => r.reportResult)(reporters);
    it('should call sub result reporter', async () => {
      const main = processor(result, ...exampleContext);
      await main();
      expect(reporters.reportResult.mock.calls).toMatchObject([[result, ctx2, ctx1]]);
    });
  });

  describe('keys processor', () => {
    const subProcessor = loggerTask(jest.fn((...largs: any): void => undefined));
    const subProcessorFactory = jest.fn(() => subProcessor);
    const result1 = Symbol('result1');
    const result2 = Symbol('result2');
    const results = {
      key1: result1,
      key2: result2,
    };
    const processor = processResult.keys(subProcessorFactory)(nopReporters);

    it('should call sub result processor for each result', async () => {
      const main: Task<void> = processor(results, ...exampleContext);
      await main();
      expect(subProcessorFactory.mock.calls).toContainEqual([nopReporters]);
      expect(subProcessor.mock.calls).toContainEqual([result1, 'key1', ctx2, ctx1]);
      expect(subProcessor.mock.calls).toContainEqual([result2, 'key2', ctx2, ctx1]);
      expect(subProcessor.mock.calls).toHaveLength(Object.keys(results).length);
    });
  });

  describe('ids processor', () => {
    const keyProcessor = loggerTask(jest.fn((...largs: any): void => undefined));
    const keyProcessorFactory = jest.fn(() => keyProcessor);
    const reporters = {
      existence: loggerTask(jest.fn((...largs: any): void => undefined)),
    };
    const result1 = Symbol('result1');
    const results = {
      id1: Option_.some(result1),
      id2: Option_.none,
    };

    it('should call existence reporter for each result', async () => {
      const processor = processResult.ids((r: typeof reporters) => r.existence, nopProcessorFactory)(reporters);
      const main = processor(results, ...exampleContext);
      await main();
      expect(reporters.existence.mock.calls).toContainEqual(['id1', true]);
      expect(reporters.existence.mock.calls).toContainEqual(['id2', false]);
      expect(reporters.existence.mock.calls).toHaveLength(Object.keys(results).length);
    });

    it('should call sub result processor for some results', async () => {
      const processor = processResult.ids((r: typeof reporters) => nopReporter, keyProcessorFactory)(reporters);
      const main = processor(results, ...exampleContext);
      await main();
      expect(keyProcessorFactory.mock.calls).toMatchObject([[reporters]]);
      expect(keyProcessor.mock.calls).toMatchObject([[result1, 'id1', ctx2, ctx1]]);
    });
  });

  describe('properties processor', () => {
    const processor1 = loggerTask(jest.fn((...largs: any) => undefined));
    const processor2 = loggerTask(jest.fn((...largs: any) => undefined));
    const factory1 = jest.fn(() => processor1);
    const factory2 = jest.fn(() => processor2);
    const result1 = Symbol('result1');
    const results = {
      property1: result1,
    };
    const processor = processResult.properties({
      property1: factory1,
      property2: factory2,
    })(nopReporters);

    it('should call other result processors based on property names', async () => {
      const main = processor(results, ...exampleContext);
      await main();
      expect(factory1.mock.calls).toContainEqual([nopReporters]);
      expect(factory2.mock.calls).toMatchObject([]);
      expect(processor1.mock.calls).toMatchObject([[result1, ctx2, ctx1]]);
      expect(processor2.mock.calls).toMatchObject([]);
    });
  });

/*
  describe('processor combination', () => {
    const reporters = {
      learnExistence: loggerTask(jest.fn((...largs: any): void => undefined)),
      receiveData: loggerTask(jest.fn((...largs: any): void => undefined)),
      receiveData2: loggerTask(jest.fn((...largs: any) => undefined)),
    };

    const result1 = Symbol('result1');
    const results = {
      property1: {
        id1: Option_.some({
          key1: result1,
        }),
        id2: Option_.none,
      },
    };
    const processor = processResult.properties({
      property1: processResult.ids(
        (r: typeof reporters) => r.learnExistence,
        processResult.keys(
          processResult.leaf((r: typeof reporters) => r.receiveData)
        ),
      ),
      property2: processResult.leaf((r: typeof reporters) => r.receiveData2)
    })(reporters);

    it('should call stuff', async () => {
      const main = processor(results);
      await main();
      expect(reporters.learnExistence.mock.calls).toMatchObject([['id1', true], ['id2', false]]);
      expect(reporters.receiveData.mock.calls).toMatchObject([[result1, 'key1', 'id1']]);
    });
  });
*/

  describe('processor combination (explicit)', () => {
    const reporters = {
      learnExistence: loggerTask(jest.fn((...largs: any): void => undefined)),
      receiveData: loggerTask(jest.fn((...largs: any): void => undefined)),
      receiveData2: loggerTask(jest.fn((...largs: any) => undefined)),
    };
    type RPF<R> = ResultProcessorFactory<typeof reporters, R>

    type Id = string;
    type Key = string;

    type KeyResult = 'result1';
    const key1Result: KeyResult = 'result1';
    const processKey: RPF<KeyResult> = processResult.leaf((r: typeof reporters) => r.receiveData);

    it('processKey', async () => {
      await processKey(reporters)(key1Result)();
    });

    type KeysResult = Record<Key, KeyResult>;
    const keysResult: KeysResult = {
      key1: key1Result,
    };
    const processKeys: RPF<KeysResult> = processResult.keys(processKey);

    it('processKeys', async () => {
      await processKeys(reporters)(keysResult)();
    });

    type Property1Result = Record<Id, Option<KeysResult>>
    const property1Result: Property1Result = {
      id1: Option_.some(keysResult),
      id2: Option_.none,
    };
    const processProperty1: RPF<Property1Result> = processResult.ids(
      (r: typeof reporters) => r.learnExistence,
      processKeys,
    );

    it('processProperty1', async () => {
      await processProperty1(reporters)(property1Result)();
    });

    type Property2Result = 'result2';
    const property2Result: Property2Result = 'result2';
    const processProperty2: RPF<Property2Result> = processResult.leaf((r: typeof reporters) => r.receiveData2);

    it('processProperty2', async () => {
      await processProperty2(reporters)(property2Result)();
    });

    type RootResult = Partial<{
      property1: Property1Result
      property2: Property2Result
    }>;
    const rootResult: RootResult = {
      property1: property1Result,
    };
    const processRootResult: RPF<RootResult> = processResult.properties({
      property1: processProperty1,
      property2: processProperty2,
    });
    it('processResult', async () => {
      await processRootResult(reporters)(result)();
    });

    /*
    const processor = processResult(reporters)
    it('should call stuff', async () => {
      const main = processor(result);
      await main();
      expect(reporters.learnExistence.mock.calls).toMatchObject([['id1', true], ['id2', false]]);
      expect(reporters.receiveData.mock.calls).toMatchObject([[key1Result, 'key1', 'id1']]);
    });
    */
  });

});
