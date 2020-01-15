import { pipe } from 'fp-ts/lib/pipeable'

import * as Context_ from '../tuple';
import { Prepend, Empty } from '../tuple';

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
