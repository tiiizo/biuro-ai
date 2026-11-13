import { describe, expect, it } from 'vitest';
import { roomLevel } from '../src/level';

describe('roomLevel', () => {
  const cases: Array<[number, number]> = [
    [0, 1],
    [1, 2], [2, 2],
    [3, 3], [4, 3],
    [5, 4], [7, 4],
    [8, 5], [11, 5],
    [12, 6], [16, 6],
    [17, 7], [23, 7],
    [24, 8], [32, 8],
    [33, 9], [45, 9],
    [46, 10], [1000, 10],
  ];

  it.each(cases)('open=%i → level %i', (open, level) => {
    expect(roomLevel(open)).toBe(level);
  });

  it.each([-1, -100, 2.5, Number.NaN, Number.POSITIVE_INFINITY])('invalid input %s → level 1', (open) => {
    expect(roomLevel(open)).toBe(1);
  });
});
