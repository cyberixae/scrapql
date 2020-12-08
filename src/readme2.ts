/*
# ScrapQL

The design of ScrapQL was partially motivated by experimentation with GraphQL. One key idea behind GraphQL is that the requirements for an API can not be known on forehand and therefore it is a good idea to create a general API that lets the caller be in control of things. Since we don't know which type sytem the caller will be using GraphQL implements it's own type system in GraphQL Schema language specifically created for the purpose. Because of the generality of the interface the types are also necessary for describing relations between different data items. GraphQL is also designed to avoid costly roundtrips between the application and the server room. The application sends "an order" for various "items" and the server takes care of collecting those items before returning them all at once to the application.

ScrapQL bears some resemblance to GraphQL but is also quite different. ScrapQL attempts to preserve the roundtrip properties of GraphQL but is intended for well known data exchange in situations where the backend code can easily be modified based on needs of the frontend of the application and the main goal is to bundle and deliver the data based on a few variables. ScrapQL is implemented in TypeScript and makes use of TypeScript's native type system. The user is adviced to define the query types with [io-ts](https://github.com/gcanti/io-ts) that provides type safe measures for (de)serialing the data types to (and from) JSON. The JSON can be passed over the wire in any shape or form. The ScrapQL library is used to define and iterate the query/result structure.

# Tutorial

In this tutorial we explain how you can use ScrapQL in a simple project with
customers and profit reports.  We will use the following database mock
throughout the tutorial.

*/
const example: any = {
  customers: {
    c001: {
      name: 'Scrooge McDuck',
      age: 75,
    },
    c002: {
      name: 'Magica De Spell',
      age: 35,
    },
  },
  reports: {
    2017: {
      profit: 500,
    },
    2018: {
      profit: 100,
    },
    2019: {
      profit: 10,
    },
  },
};

type Json =
    | string
    | number
    | boolean
    | null
    | { [p: string]: Json }
    | Array<Json>;

interface Database {
  getCustomer: (c: string) => Promise<undefined|Json>;
  getReport: (y: number) => Promise<Json>;
}

const db: Database = {
  getCustomer: (customerId) => Promise.resolve(example.customers[customerId]),
  getReport: (year) => Promise.resolve(example.reports[year] || { profit: 0 }),
};
/*


## Define Data Validators

*/
import * as t from 'io-ts';

const CustomerId = t.string;
type CustomerId = t.TypeOf<typeof CustomerId>;

const Customer = t.type({
  name: t.string,
  age: t.number,
});
type Customer = t.TypeOf<typeof Customer>;

const Year = t.number;
type Year = t.TypeOf<typeof Year>;

const Report = t.type({
  profit: t.number,
});
type Report = t.TypeOf<typeof Report>;

const Errors = t.array(t.string);
type Errors = t.TypeOf<typeof Errors>;
/*

## Define Query Validator

*/

import { Dict, Wsp, Wsp0 } from './scrapql';
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray';

// name and version from package.json
const packageName = 'scrapql-example-app';
const packageVersion = '0.0.1';

const QUERY_PROTOCOL= `${packageName}/${packageVersion}/scrapql/query`;
const RESULT_PROTOCOL = `${packageName}/${packageVersion}/scrapql/result`;

export type Version = scrapql.LiteralBundle<
  Errors,
  Ctx0,
  Wsp0,
  Resolvers,
  Reporters,
  typeof QUERY_PROTOCOL,
  typeof RESULT_PROTOCOL
>;
export const Version: Version = scrapql.literal.bundle({
  Err: Errors,
  QueryPayload: t.literal(QUERY_PROTOCOL),
  ResultPayload: t.literal(RESULT_PROTOCOL),
});


export type GetCustomer = scrapql.LeafBundle<
  Errors,
  Ctx<[CustomerId]>,
  Wsp<{ customer: Customer }>,
  Resolvers,
  Reporters,
  true,
  Customer
>;
export const GetCustomer: GetCustomer = scrapql.leaf.bundle({
  Err: Errors,
  QueryPayload: t.literal(true),
  ResultPayload: Customer,
  queryConnector: (r: Resolvers) => r.fetchCustomer,
  queryPayloadCombiner: (_w, r) => Either_.right(r),
  queryPayloadExamplesArray: [true],
  resultConnector: (r: Reporters) => r.receiveCustomer,
  resultPayloadCombiner: (_w, r) => Either_.right(r),
  resultPayloadExamplesArray: [{
      name: 'Scrooge McDuck',
      age: 75,
    }],
});

type CustomerOps = scrapql.PropertiesBundle<{
  get: GetCustomer;
}>;
const CustomerOps: CustomerOps = scrapql.properties.bundle({
  get: GetCustomer,
});

type Customers = scrapql.IdsBundle<
  Errors,
  Ctx0,
  Wsp0,
  Resolvers,
  Reporters,
  CustomerId,
  t.TypeOf<typeof CustomerOps['Query']>,
  t.TypeOf<typeof CustomerOps['Result']>
>;
const Customers: Customers = scrapql.ids.bundle({
  id: {
    Id: CustomerId,
    idExamples: ['c001', 'c999'],
  },
  item: CustomerOps,
  queryConnector: (r: Resolvers) => r.checkCustomerExistence,
  resultConnector: (r: Reporters) => r.learnCustomerExistence,
});


export type GetReport = scrapql.LeafBundle<
  Errors,
  Ctx<[Year]>,
  Wsp0,
  Resolvers,
  Reporters,
  true,
  Report
>;
export const GetReport: GetReport = scrapql.leaf.bundle({
  Err: Errors,
  QueryPayload: t.literal(true),
  ResultPayload: Report,
  queryConnector: (r: Resolvers) => r.fetchReport,
  queryPayloadCombiner: (_w, r) => Either_.right(r),
  queryPayloadExamplesArray: [true],
  resultConnector: (r: Reporters) => r.receiveReport,
  resultPayloadCombiner: (_w, r) => Either_.right(r),
  resultPayloadExamplesArray: [{
    profit: 500,
  }],
});

type ReportOps = scrapql.PropertiesBundle<{
  get: GetReport;
}>;
const ReportOps: ReportOps = scrapql.properties.bundle({
  get: GetReport,
});

type Reports = scrapql.KeysBundle<
  Errors,
  Ctx0,
  Wsp0,
  Resolvers,
  Reporters,
  Year,
  t.TypeOf<typeof ReportOps['Query']>,
  t.TypeOf<typeof ReportOps['Result']>
>;
const Reports: Reports = scrapql.keys.bundle({
  key: {
    Key: Year,
    keyExamples: [1999, 2004],
  },
  item: ReportOps,
});

export type Root = scrapql.PropertiesBundle<{
  protocol: Version,
  reports: Reports,
  customers: Customers,
}>;
export const Root: Root = scrapql.properties.bundle({
  protocol: Version,
  reports: Reports,
  customers: Customers,
});


const Query = Root.Query;
type Query = t.TypeOf<typeof Query>;
/*

You can use the query validator to validate JSON queries as follows.

*/
import { validator } from 'io-ts-validator';

const exampleJsonQuery: Json = {
  protocol: QUERY_PROTOCOL,
  reports: [
    ['2018', {get: true}],
    ['3030', {get: true}],
  ],
  customers: [
    ['c002', {get: true}],
    ['c007', {get: true}],
  ],
};

const exampleQuery: Query = validator(Query).decodeSync(exampleJsonQuery);
/*

## Define Query Resolvers

*/
import { Task } from 'fp-ts/lib/Task';
import { TaskEither } from 'fp-ts/lib/TaskEither';

import { pipe } from 'fp-ts/lib/pipeable';
import * as Task_ from 'fp-ts/lib/Task';
import * as Option_ from 'fp-ts/lib/Option';
import * as Either_ from 'fp-ts/lib/Either';
import * as TaskEither_ from 'fp-ts/lib/TaskEither';
import { failure } from 'io-ts/lib/PathReporter'

import * as scrapql from './scrapql';
import { Ctx } from './scrapql';

type Resolvers = scrapql.Resolvers<{
  readonly fetchReport: (a: true, b: Ctx<[Year]>) => TaskEither<Errors, Report>;
  readonly fetchCustomer: (a: true, b: Ctx<[CustomerId]>, c: { customer: Customer }) => TaskEither<Errors, Customer>;
  readonly checkCustomerExistence: (a: CustomerId) => TaskEither<Errors, Option<{ customer: Customer }>>;
}>

const resolvers: Resolvers = {
  fetchReport: (_queryArgs, [year]) => pipe(
    () => db.getReport(year),
    Task_.map(Report.decode),
    TaskEither_.mapLeft(failure),
  ),

  fetchCustomer: (_queryArgs, [_customerId], {customer}) => pipe(
    customer,  // cached by checkCustomerExistence
    TaskEither_.right,
  ),

  checkCustomerExistence: (customerId) => pipe(
    () => db.getCustomer(customerId),
    Task_.map((nullable) => pipe(
      Option_.fromNullable(nullable),
      Option_.map(Customer.decode),
      Option_.map(Either_.map((customer) => ({customer}))),
      Option_.sequence(Either_.either),
      Either_.mapLeft(failure),
    )),
  ),

};
/*


## Define Query Processor

*/
import { QueryProcessor, Ctx0 } from './scrapql';

const processQuery = Root.processQuery
/*

You can run the processor as follows.

*/
import { processorInstance, ctx0 } from './scrapql';
import * as ruins from 'ruins-ts';

async function generateExampleOutput() {
  const qp = processorInstance(processQuery, ctx0, {}, resolvers);
  const q: Query = await validator(Query).decodePromise(exampleJsonQuery);
  const output = await ruins.fromTaskEither(qp(q));
  console.log(output);
}

generateExampleOutput();
/*

The result object should look as follows.

*/
const exampleResult = {
  protocol: 'scrapql-example-app/0.0.1/scrapql/result',
  reports: [
    ['2018', {
      get: {
        _tag: 'Right',  // get success
        right: { profit: 100 }
      },
    }],
    ['3030', {
      get: {
        _tag: 'Right',  // get success
        right: { profit: 0 }
      },
    }],
  ],
  customers: [
    ['c002', {
      _tag: 'Right',  // identity check success
      right: {
        _tag: 'Some',  // customer exists
        some: {
          get: {
            _tag: 'Right',  // get success
            right: {
              name: 'Magica De Spell',
              age: '35',
            },
          },
        },
      },
    }],
    ['c007', {
      _tag: 'Right',  // identity check success
      right: {
        _tag: 'None',  // customer does not exist
      },
    }],
  ],
} as unknown as Result;
/*

## Define Result Validator

Now that we know what the output will look like we can define a result validator.

*/
import { option as tOption } from 'io-ts-types/lib/option';

const Result = Root.Result;
type Result = t.TypeOf<typeof Result>;
/*

We can now use the result validator to encode the result as JSON.

*/
const exampleJsonResult: Json = JSON.parse(JSON.stringify(Result.encode(exampleResult)));
/*

It all comes together as the following query processor.

*/
async function jsonQueryProcessor(jsonQuery: Json): Promise<Json> {
  const qp = processorInstance(processQuery, ctx0, {}, resolvers);
  const q: Query = await validator(Query).decodePromise(jsonQuery);
  const r: Result = await ruins.fromTaskEither(qp(q));
  const jsonResult: Json = JSON.parse(JSON.stringify(Result.encode(r)));
  return jsonResult;
}
/*


## Define Result Reporters

*/
import { Either } from 'fp-ts/lib/Either';
import { Option } from 'fp-ts/lib/Option';

type Reporters = scrapql.Reporters<{
  readonly receiveReport: (a: Report, b: Ctx<[true, Year]> ) => Task<void>;
  readonly receiveCustomer: (a: Customer, b: Ctx<[true, CustomerId]>) => Task<void>;
  readonly learnCustomerExistence: (a: boolean, b: Ctx<[CustomerId]>) => Task<void>;
}>

const reporters: Reporters = {

  receiveReport: (report, [_query, year]) => () => {
    return Promise.resolve(console.log(year, report));
  },

  receiveCustomer: (customer, [_query, customerId]) => () => {
    return Promise.resolve(console.log(customerId, customer));
  },

  learnCustomerExistence: (existence, [customerId]) => () => {
    return Promise.resolve(console.log(customerId, existence ? 'known customer' : 'unknown customer'));
  },

};
/*


## Define Result Processor

*/
import { ResultProcessor } from './scrapql';

// Ideally the type casts would be unnecessary, see https://github.com/maasglobal/scrapql/issues/12
const processResult = Root.processResult;

/*

## Example Flow

Now that we have a query processor we can finally use it to process queries.
The query processor works as follows.

*/
import * as Console_ from 'fp-ts/lib/Console';
import * as IOEither_ from 'fp-ts/lib/IOEither';
import { either as tEither } from 'io-ts-types/lib/either';

async function server(request: string): Promise<string> {
  const main = pipe(
    IOEither_.tryCatch(() => request, (reason: unknown) => [String(reason)]),
    TaskEither_.fromIOEither,
    TaskEither_.chain((body: string) => pipe(
      validator(Query, 'json').decodeEither(body),
      TaskEither_.fromEither,
    )),
    TaskEither_.chain((query: Query) => pipe(
      processorInstance(processQuery, ctx0, {}, resolvers),
      (qp) => qp(query),
    )),
    Task_.chainFirst((result: Either<Errors, Result>) => pipe(
      result,
      Either_.fold(
        (errors) => Console_.error(['Error!'].concat(errors).join('\n')),
        (_output) => Console_.log('Success!'),
      ),
      Task_.fromIO,
    )),
    Task_.map((result: Either<Errors, Result>) => pipe(
      result,
      Either_.fold(
        (_errors): unknown => ({ error: 'Internal server error' }),
        (xxx) => ({ data: Result.encode(xxx) }),
      ),
      (json) => Either_.stringifyJSON(json, (reason) => String(reason)),
    )),
    TaskEither_.fold(
      (errorString) => Task_.of(errorString), // JSON stringify failure
      (jsonString) => Task_.of(jsonString), // processing success or failure
    ),
  );
  return main();
}

async function client(query: Query): Promise<void> {
  const main = pipe(
    validator(Query, 'json').encodeEither(query),
    TaskEither_.fromEither,
    TaskEither_.chain((requestBody) => pipe(
      TaskEither_.tryCatch(() => server(requestBody), (reason) => [String(reason)]),
    )),
    TaskEither_.chain((body: string) => pipe(
      validator(tEither(Errors, Result), 'json').decodeEither(body),
      TaskEither_.fromEither,
    )),
    TaskEither_.chain((result: Either<Errors, Result>) => pipe(
      result,
      TaskEither_.fromEither,
    )),
    TaskEither_.fold(
      (errors) => () => Promise.resolve(console.error(errors)),
      (result: Result) => pipe(
        processorInstance( processResult, ctx0, {}, reporters ),
        (rp) => rp(result),
      ),
    ),
  );
  return main();
}
/*
*/
export { Customer, CustomerId, Errors, Json, QUERY_PROTOCOL, Query, RESULT_PROTOCOL, Report, Result, Year, client, db, example, exampleBundle, exampleJsonQuery, exampleQuery, exampleResult, exampleJsonResult, jsonQueryProcessor, packageName, packageVersion, processQuery, processResult, reporters, resolvers, server }
