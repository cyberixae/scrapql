# ScrapQL

The design of ScrapQL was partially motivated by experimentation with GraphQL. One key idea behind GraphQL is that the requirements for an API can not be known on forehand and therefore it is a good idea to create a general API that lets the caller be in control of things. Since we don't know which type sytem the caller will be using GraphQL implements it's own type system in GraphQL Schema language specifically created for the purpose. Because of the generality of the interface the types are also necessary for describing relations between different data items. GraphQL is also designed to avoid costly roundtrips between the application and the server room. The application sends "an order" for various "items" and the server takes care of collecting those items before returning them all at once to the application.

ScrapQL bears some resemblance to GraphQL but is also quite different. ScrapQL attempts to preserve the roundtrip properties of GraphQL but is intended for well known data exchange in situations where the backend code can easily be modified based on needs of the frontend of the application and the main goal is to bundle and deliver the data based on a few variables. ScrapQL is implemented in TypeScript and makes use of TypeScript's native type system. The user is adviced to define the query types with [io-ts](https://github.com/gcanti/io-ts) that provides type safe measures for (de)serialing the data types to (and from) JSON. The JSON can be passed over the wire in any shape or form. The ScrapQL library is used to define and iterate the query/result structure.

# Tutorial

In this tutorial we explain how you can use ScrapQL in a simple project with
customers and profit reports.  We will use the following database mock
throughout the tutorial.

```typescript
const example: any = {
  customers: {
    c001: {
      name: 'Scrooge McDuck',
      age: '75',
    },
    c002: {
      name: 'Magica De Spell',
      age: '35',
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
    | { [property: string]: Json }
    | Json[];

interface Database {
  hasCustomer: (c: string) => Promise<boolean>;
  getCustomer: (c: string) => Promise<Json>;
  getReport: (y: string) => Promise<Json>;
}

const db: Database = {
  hasCustomer: (customerId) => Promise.resolve(example.customers.hasOwnProperty(customerId)),
  getCustomer: (customerId) => Promise.resolve(example.customers[customerId]),
  getReport: (year) => Promise.resolve(example.reports[year] || { profit: 0 }),
};
```


## Define Data Validators

```typescript
import * as t from 'io-ts';

const CustomerId = t.string;
type CustomerId = t.TypeOf<typeof CustomerId>;

const Customer = t.type({
  name: t.string,
  age: t.number,
});
type Customer = t.TypeOf<typeof Customer>;

const Year = t.string;
type Year = t.TypeOf<typeof Year>;

const Report = t.type({
  profit: t.number,
});
type Report = t.TypeOf<typeof Report>;

const Errors = t.array(t.string);
type Errors = t.TypeOf<typeof Errors>;
```

## Define Query Validator

```typescript

import { Dict } from 'scrapql/lib/dict';

// name and version from package.json
const packageName = 'scrapql-example-app';
const packageVersion = '0.0.1';

const QUERY_PROTOCOL= `${packageName}/${packageVersion}/scrapql/query`;

const Query = t.type({
  protocol: t.literal(QUERY_PROTOCOL),
  get: t.type({
    reports: Dict(Year, t.literal(true)),
    customers: Dict(CustomerId, t.literal(true)),
  }),
});
type Query = t.TypeOf<typeof Query>;
```

You can use the query validator to validate JSON queries as follows.

```typescript
import * as tPromise from 'io-ts-promise';

const exampleJsonQuery: Json = {
  protocol: QUERY_PROTOCOL,
  get: {
    reports: [
      ['2018', true],
      ['3030', true],
    ],
    customers: [
      ['c002', true],
      ['c007', true],
    ],
  },
};

const exampleQuery: Promise<Query> = tPromise.decode(Query, exampleJsonQuery);
```

## Define Query Resolvers

```typescript
import { Task } from 'fp-ts/lib/Task';
import { TaskEither } from 'fp-ts/lib/TaskEither';

import { pipe } from 'fp-ts/lib/pipeable';
import * as Task_ from 'fp-ts/lib/Task';
import * as Either_ from 'fp-ts/lib/Either';
import * as TaskEither_ from 'fp-ts/lib/TaskEither';
import { failure } from 'io-ts/lib/PathReporter'

import { Ctx } from 'scrapql';

interface Resolvers {
  readonly fetchReport: (a: unknown, b: Ctx<Year>) => TaskEither<Errors, Report>;
  readonly fetchCustomer: (a: unknown, b: Ctx<CustomerId>) => TaskEither<Errors, Customer>;
  readonly checkCustomerExistence: (a: CustomerId) => TaskEither<Errors, boolean>;
}

const resolvers: Resolvers = {
  fetchReport: (_queryArgs, [year]) => pipe(
    () => db.getReport(year),
    Task_.map(Report.decode),
    TaskEither_.mapLeft(failure),
  ),

  fetchCustomer: (_queryArgs, [customerId]) => pipe(
    () => db.getCustomer(customerId),
    Task_.map(Customer.decode),
    TaskEither_.mapLeft(failure),
  ),

  checkCustomerExistence: (customerId) => pipe(
    () => db.hasCustomer(customerId),
    Task_.map(Either_.right),
  ),

};
```


## Define Query Processor

```typescript
import { process, processorInstance, Ctx0, ctx0 } from 'scrapql';

const RESULT_PROTOCOL = `${packageName}/${packageVersion}/scrapql/result`;

const processQuery = processorInstance(
  process.query.properties<Resolvers, Query, Result, Ctx0>({
    protocol: process.query.literal(RESULT_PROTOCOL),
    get: process.query.properties({
      reports: process.query.keys(
        process.query.leaf((r: Resolvers) => r.fetchReport)
      ),
      customers: process.query.ids(
        (r: Resolvers) => r.checkCustomerExistence,
        process.query.leaf((r: Resolvers) => r.fetchCustomer),
      ),
    }),
  }),
  resolvers,
  ctx0,
);
```

Running the processor will produce the following result.

```typescript
const exampleResult = {
  protocol: 'scrapql-example-app/0.0.1/scrapql/result',
  get: {
    reports: [
      ['2018', {
        _tag: 'Right',
        right: { profit: 100 }
      }],
      ['3030', {
        _tag: 'Right',
        right: { profit: 0 }
      }],
    ],
    customers: [
      ['c002', {
        _tag: 'Right',
        right: {
          _tag: 'Some',
          some: {
            name: 'Magica De Spell',
            age: '35',
          },
        },
      }],
      ['c007', {
        _tag: 'Right',
        right: {
          _tag: 'None',
        },
      }],
    ],
  },
};
```

You can run the processor as follows.

```typescript
async function generateExampleOutput() {
  const q: Query = await tPromise.decode(Query, exampleJsonQuery);
  const output = await processQuery(q)();
  console.log(output);
}

generateExampleOutput();
```

The result object should look as follows.

## Define Result Validator

Now that we know what the output will look like we can define a result validator.

```typescript
import { option as tOption } from 'io-ts-types/lib/option';
import { either as tEither } from 'io-ts-types/lib/either';

const Result = t.type({
  protocol: t.literal(RESULT_PROTOCOL),
  get: t.type({
    reports: Dict(Year, tEither(Errors, Report)),
    customers: Dict(CustomerId, tEither(Errors, tOption(Customer))),
  }),
});
type Result = t.TypeOf<typeof Result>;
```

We can now use the result validator to encode the result as JSON.

```typescript
async function jsonQueryProcessor(jsonQuery: Json): Promise<Json> {
  const q: Query = await tPromise.decode(Query, jsonQuery);
  const r: Result = await processQuery(q)();
  const jsonResult: Json = JSON.parse(JSON.stringify(Result.encode(r)));
  return jsonResult;
}
```


## Define Result Reporters

```typescript
import { Either } from 'fp-ts/lib/Either';
import { Option } from 'fp-ts/lib/Option';

interface Reporters {
  readonly receiveReport: (a: Either<Errors, Report>, b: Ctx<Year> ) => Task<void>;
  readonly receiveCustomer: (a: Either<Errors, Option<Customer>>, b: Ctx<CustomerId>) => Task<void>;
  readonly learnCustomerExistence: (a: Either<Errors, boolean>, b: Ctx<CustomerId>) => Task<void>;
}

const reporters: Reporters = {

  receiveReport: (result, [year]) => pipe(
    result,
    Either_.fold(
      (errors) => () => Promise.resolve(console.error(year, errors)),
      (report) => () => Promise.resolve(console.log(year, report)),
    ),
  ),

  receiveCustomer: (result, [customerId]) => pipe(
    result,
    Either_.fold(
      (errors) => () => Promise.resolve(console.error(customerId, errors)),
      (customer) => () => Promise.resolve(console.log(customerId, customer)),
    ),
  ),

  learnCustomerExistence: (result, [customerId]) => pipe(
    result,
    Either_.fold(
      (errors) => () => Promise.resolve(console.error(customerId, errors)),
      (existence) => () => Promise.resolve(console.log(customerId, existence ? 'known customer' : 'unknown customer')),
    ),
  ),

};
```


## Define Result Processor

```typescript


const processResult = processorInstance(
  process.result.properties({
    protocol: process.result.literal(),
    get: process.result.properties({
      reports: process.result.keys(
        process.result.leaf((r: Reporters) => r.receiveReport)
      ),
      customers: process.result.ids(
        (r: Reporters) => r.learnCustomerExistence,
        process.result.leaf((r: Reporters) => r.receiveCustomer)
      ),
    }),
  }),
  reporters,
  ctx0,
);
```


## Example Flow

Now that we have a query processor we can finally use it to process queries.
The query processor works as follows.

```typescript
import * as IOEither_ from 'fp-ts/lib/IOEither';

async function server(request: string): Promise<string> {
  const main = pipe(
    IOEither_.tryCatch(() => request, (reason: unknown) => [String(reason)]),
    TaskEither_.fromIOEither,
    TaskEither_.chain((body: string) => pipe(
      Either_.parseJSON(body, (reason) => [String(reason)]),
      TaskEither_.fromEither,
    )),
    (x: TaskEither<Array<string>,unknown>) => x,
    TaskEither_.chain((json: unknown) => pipe(
      json,
      Query.decode,
      Either_.mapLeft(failure),
      TaskEither_.fromEither,
    )),
    TaskEither_.chain((query: Query) => pipe(
      processQuery(query),
      Task_.map((result) => Either_.right(result)),
    )),
    Task_.map((result: Either<Errors, Result>) => tEither(Errors, Result).encode(result)),
    Task_.map((json) => pipe(
      Either_.stringifyJSON(json, (reason) => String(reason)),
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
    Query.encode(query),
    (json: Json) => Either_.stringifyJSON(json, (reason) => [String(reason)]),
    TaskEither_.fromEither,
    TaskEither_.chain((requestBody) => pipe(
      TaskEither_.tryCatch(() => server(requestBody), (reason) => [String(reason)]),
    )),
    TaskEither_.chain((body: string) => pipe(
       Either_.parseJSON(body, (reason) => [String(reason)]),
      TaskEither_.fromEither,
    )),
    TaskEither_.chain((json: unknown) => pipe(
      json,
      tEither(Errors, Result).decode,
      Either_.mapLeft(failure),
      TaskEither_.fromEither,
    )),
    TaskEither_.chain((result: Either<Errors, Result>) => pipe(
      result,
      TaskEither_.fromEither,
    )),
    TaskEither_.fold(
      (errors) => () => Promise.resolve(console.error(errors)),
      (result: Result) => processResult(result),
    ),
  );
  return main();
}
```


The following exports are used by test code.

```typescript
export { Customer, CustomerId, Errors, Json, QUERY_PROTOCOL, Query,
RESULT_PROTOCOL, Report, Result, Year, client, db, example, exampleJsonQuery,
exampleQuery, exampleResult, jsonQueryProcessor, packageName, packageVersion,
processQuery, processResult, reporters, resolvers, server }
```
