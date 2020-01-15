import { pipe } from 'fp-ts/lib/pipeable';

import * as Context_ from '../context';
import { Prepend, Empty } from '../context';

describe('tuple', () => {
  it('prepend', () => {
    const context: Prepend<number, Prepend<'foo', Empty>> = pipe(
      Context_.empty,
      Context_.prepend<'foo'>('foo'),
      Context_.prepend(123),
    );
    expect(context).toMatchObject([123, ['foo', []]]);
  });
});
