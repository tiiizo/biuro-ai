import { describe, expect, it } from 'vitest';
import { closest, editDistance } from '../src/suggest';
import { ROOM_KEYS } from '../src/parse';

describe('editDistance', () => {
  it.each([
    ['', '', 0],
    ['abc', '', 3],
    ['open', 'opem', 1],
    ['colors', 'colros', 2],
    ['repo', 'repo', 0],
  ])('%s ↔ %s = %i', (a, b, d) => {
    expect(editDistance(a, b)).toBe(d);
    expect(editDistance(b, a)).toBe(d);
  });
});

describe('closest', () => {
  it.each([
    ['opem', 'open'],
    ['Open', 'open'],
    ['agent', 'agents'],
    ['prop', 'props'],
    ['color', 'colors'],
    ['themes', 'theme'],
  ])('%s → %s', (n, c) => expect(closest(n, ROOM_KEYS)).toBe(c));

  it.each(['level', 'status', 'xyz', ''])('%s → no suggestion', (n) => expect(closest(n, ROOM_KEYS)).toBeUndefined());

  it('tie → no suggestion', () => expect(closest('ab', ['aa', 'bb'])).toBeUndefined());
});
