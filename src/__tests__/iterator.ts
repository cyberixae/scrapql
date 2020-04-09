import { pipe } from 'fp-ts/lib/pipeable';

import * as SIterator_ from '../iterator';
import { SIterator } from '../iterator';

describe('SIterator', () => {
  it('fromGF', () => {
    const gen: SIterator<'a' | 'b' | 'c'> = SIterator_.fromGF(function* () {
      yield 'a';
      yield 'b';
      yield 'c';
    });
    const handle = gen();
    expect(handle.next()).toStrictEqual({ value: 'a', done: false });
    expect(handle.next()).toStrictEqual({ value: 'b', done: false });
    expect(handle.next()).toStrictEqual({ value: 'c', done: true });
  });

  it('map', () => {
    const numbers: SIterator<number> = SIterator_.fromGF(function* () {
      yield 1;
      yield 2;
      yield 3;
    });
    const even = pipe(
      numbers,
      SIterator_.map((x) => 2 * x),
    );
    const handle = even();
    expect(handle.next()).toStrictEqual({ value: 2, done: false });
    expect(handle.next()).toStrictEqual({ value: 4, done: false });
    expect(handle.next()).toStrictEqual({ value: 6, done: true });
  });

  it('sequenceT1', () => {
    type AB = 'a' | 'b';
    const ab: SIterator<AB> = SIterator_.sIterator(['a', 'b']);
    type One = [SIterator<AB>];
    const separate: One = [ab];
    const combined: SIterator<[AB]> = pipe(SIterator_.sequenceT(...separate));
    const handle = combined();
    expect(handle.next()).toStrictEqual({ value: ['a'], done: false });
    expect(handle.next()).toStrictEqual({ value: ['b'], done: true });
  });
  it('sequenceT2', () => {
    type AB = 'a' | 'b';
    const ab: SIterator<AB> = SIterator_.sIterator(['a', 'b']);
    type CD = 'c' | 'd';
    const cd: SIterator<CD> = SIterator_.sIterator(['c', 'd']);
    type Two = [SIterator<AB>, SIterator<CD>];
    const separate: Two = [ab, cd];
    const combined: SIterator<[AB, CD]> = pipe(SIterator_.sequenceT(...separate));
    const handle = combined();
    expect(handle.next()).toStrictEqual({ value: ['a', 'c'], done: false });
    expect(handle.next()).toStrictEqual({ value: ['a', 'd'], done: false });
    expect(handle.next()).toStrictEqual({ value: ['b', 'c'], done: false });
    expect(handle.next()).toStrictEqual({ value: ['b', 'd'], done: true });
  });
  it('sequenceT3', () => {
    type AB = 'a' | 'b';
    const ab: SIterator<AB> = SIterator_.sIterator(['a', 'b']);
    type CD = 'c' | 'd';
    const cd: SIterator<CD> = SIterator_.sIterator(['c', 'd']);
    type EF = 'e' | 'f';
    const ef: SIterator<EF> = SIterator_.sIterator(['e', 'f']);
    type Three = [SIterator<AB>, SIterator<CD>, SIterator<EF>];
    const separate: Three = [ab, cd, ef];
    const combined: SIterator<[AB, CD, EF]> = pipe(SIterator_.sequenceT(...separate));
    const handle = combined();
    expect(handle.next()).toStrictEqual({ value: ['a', 'c', 'e'], done: false });
    expect(handle.next()).toStrictEqual({ value: ['a', 'c', 'f'], done: false });
    expect(handle.next()).toStrictEqual({ value: ['a', 'd', 'e'], done: false });
    expect(handle.next()).toStrictEqual({ value: ['a', 'd', 'f'], done: false });
    expect(handle.next()).toStrictEqual({ value: ['b', 'c', 'e'], done: false });
    expect(handle.next()).toStrictEqual({ value: ['b', 'c', 'f'], done: false });
    expect(handle.next()).toStrictEqual({ value: ['b', 'd', 'e'], done: false });
    expect(handle.next()).toStrictEqual({ value: ['b', 'd', 'f'], done: true });
  });

  it('sequenceS1', () => {
    type AB = 'a' | 'b';
    const ab: SIterator<AB> = SIterator_.sIterator(['a', 'b']);
    type One = {
      ab: SIterator<AB>;
    };
    const separate: One = { ab };
    const combined: SIterator<{ ab: AB }> = SIterator_.sequenceS(separate);
    const handle = combined();
    expect(handle.next()).toStrictEqual({
      value: { ab: 'a' },
      done: false,
    });
    expect(handle.next()).toStrictEqual({
      value: { ab: 'b' },
      done: true,
    });
  });
  it('sequenceS2', () => {
    type AB = 'a' | 'b';
    const ab: SIterator<AB> = SIterator_.sIterator(['a', 'b']);
    type CD = 'c' | 'd';
    const cd: SIterator<CD> = SIterator_.sIterator(['c', 'd']);
    type Two = {
      ab: SIterator<AB>;
      cd: SIterator<CD>;
    };
    const separate: Two = { ab, cd };
    const combined: SIterator<{ ab: AB; cd: CD }> = SIterator_.sequenceS(separate);
    const handle = combined();
    expect(handle.next()).toStrictEqual({
      value: { ab: 'a', cd: 'c' },
      done: false,
    });
    expect(handle.next()).toStrictEqual({
      value: { ab: 'a', cd: 'd' },
      done: false,
    });
    expect(handle.next()).toStrictEqual({
      value: { ab: 'b', cd: 'c' },
      done: false,
    });
    expect(handle.next()).toStrictEqual({
      value: { ab: 'b', cd: 'd' },
      done: true,
    });
  });
  it('sequenceS3', () => {
    type AB = 'a' | 'b';
    const ab: SIterator<AB> = SIterator_.sIterator(['a', 'b']);
    type CD = 'c' | 'd';
    const cd: SIterator<CD> = SIterator_.sIterator(['c', 'd']);
    type EF = 'e' | 'f';
    const ef: SIterator<EF> = SIterator_.sIterator(['e', 'f']);
    type Three = {
      ab: SIterator<AB>;
      cd: SIterator<CD>;
      ef: SIterator<EF>;
    };
    const separate: Three = { ab, cd, ef };
    const combined: SIterator<{ ab: AB; cd: CD; ef: EF }> = SIterator_.sequenceS(
      separate,
    );
    const handle = combined();
    expect(handle.next()).toStrictEqual({
      value: { ab: 'a', cd: 'c', ef: 'e' },
      done: false,
    });
    expect(handle.next()).toStrictEqual({
      value: { ab: 'a', cd: 'c', ef: 'f' },
      done: false,
    });
    expect(handle.next()).toStrictEqual({
      value: { ab: 'a', cd: 'd', ef: 'e' },
      done: false,
    });
    expect(handle.next()).toStrictEqual({
      value: { ab: 'a', cd: 'd', ef: 'f' },
      done: false,
    });
    expect(handle.next()).toStrictEqual({
      value: { ab: 'b', cd: 'c', ef: 'e' },
      done: false,
    });
    expect(handle.next()).toStrictEqual({
      value: { ab: 'b', cd: 'c', ef: 'f' },
      done: false,
    });
    expect(handle.next()).toStrictEqual({
      value: { ab: 'b', cd: 'd', ef: 'e' },
      done: false,
    });
    expect(handle.next()).toStrictEqual({
      value: { ab: 'b', cd: 'd', ef: 'f' },
      done: true,
    });
  });
});
