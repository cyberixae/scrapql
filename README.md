# ScrapQL

The design of ScrapQL was partially motivated by experimentation with GraphQL. One key idea behind GraphQL is that the requirements for an API can not be known on forehand and therefore it is a good idea to create a general API that lets the caller be in control of things. Since we don't know which type sytem the caller will be using GraphQL implements it's own type system in GraphQL Schema language specifically created for the purpose. Because of the generality of the interface the types are also necessary for describing relations between different data items. GraphQL is also designed to avoid costly roundtrips between the application and the server room. The application sends "an order" for various "items" and the server takes care of collecting those items before returning them all at once to the application.

ScrapQL bears some resemblance to GraphQL but is also quite different. ScrapQL attempts to preserve the roundtrip properties of GraphQL but is intended for well known data exchange in situations where the backend code can easily be modified based on needs of the frontend of the application and the main goal is to bundle and deliver the data based on a few variables. ScrapQL is implemented in TypeScript and makes use of TypeScript's native type system. The user is adviced to define the query types with [io-ts](https://github.com/gcanti/io-ts) that provides type safe measures for (de)serialing the data types to (and from) JSON. The JSON can be passed over the wire in any shape or form. The ScrapQL library is used to define and iterate the query/result structure.

# Tutorial

## Define Validators

```typescript
import * as t from 'io-ts'

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

const Err = t.string;
type Err = t.TypeOf<typeof Err>;
```

## Define Protocol

```typescript
package = 'scrapql-example-app';  // from package.json
version = '0.0.1';                // from package.json

const queryProtocol = `${packge}/${version}/scrapql/query`;

const Query = t.type({
  protocol: t.literal(queryProtocol),
  get: t.type({
    reports: t.record(Year, Report)),
    customers: t.record(CustomerId, Customer)),
  }),
});
export type Query = t.TypeOf<typeof Query>;
```

## Define Resolvers

```typescript
interface Resolvers {
  readonly fetchReport: (y: Year) => TaskEither<Err, Report>;
  readonly fetchCustomer: (c: CustomerId) => TaskEither<Err, Option<Customer>>;
  readonly checkCustomerExistence: (a: CustomerId) => Task<boolean>;
}
```





## Create Query Processor

```typescript
const queryProcessor = scrap.processQueryProperties({
  version: scrap.replaceWith(RESPONSE_PROTOCOL),
  get: scrap.processQueryIds(
    (r: Resolvers) => r.checkExistence,
    scrap.processQueryKeys(
      scrap.processQueryFields((r: Resolvers) => r.fetchData)
    ),
  ),
});
```








const resultProtocol = `${packge}/${version}/scrapql/result`;

export const Result = t.type({
  protocol: t.literal(resultProtocol),
  get: ,
});
export type Result = t.TypeOf<typeof Result>;



interface Reporters {
  readonly receiveCustomer: (a: Either<Err, Option<Customer>>) => Task<void>;
  readonly learnCustomerExistence: (a: CustomerId, b: boolean) => Task<void>;
}

const processor = scrap.processResultProperties({
  version: scrap.discard,
  get: scrap.processResultIds(
    (r: Reporters) => r.learnExistence,
    scrap.processResultKeys(
      scrap.processResultFields((r: Reporters) => r.receiveData)
    ),
  ),
});
```
