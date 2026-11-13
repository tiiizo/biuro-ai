import { describe, expect, it } from 'vitest';
import {
  ROOM_DEPTH,
  overlaps,
  GAP,
  DIRECTOR_LEVEL_BONUS,
  CORE,
  roomSize,
  ROOM_WIDTH,
  buildingLayout,
  floorLayout,
  type Rect,
  type FloorInput,
} from '../src/layout';
import type { Level } from '../src/level';
import { parseOffice } from '../src/parse';
import sample from './fixtures/office.md?raw';

/** Deterministic PRNG (mulberry32), so the property tests are repeatable without extra dependencies. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomFloor(rnd: () => number, name: string, count: number, withDirector: boolean): FloorInput {
  const rooms = Array.from({ length: count }, (_, i) => ({
    name: `${name}-room-${i}`,
    level: (1 + Math.floor(rnd() * 10)) as Level,
  }));
  if (withDirector && rooms.length > 0) {
    const i = Math.floor(rnd() * rooms.length);
    rooms[i] = { ...rooms[i]!, name: 'Director' };
  }
  return { name, rooms };
}

/** A rectangle grown by half the gap: two of them do not overlap ⇔ the GAP corridor is kept. */
function withCorridor(r: Rect): Rect {
  const m = GAP / 2;
  return { x: r.x - m, z: r.z - m, w: r.w + 2 * m, d: r.d + 2 * m };
}

function contains(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.z >= outer.z && inner.x + inner.w <= outer.x + outer.w && inner.z + inner.d <= outer.z + outer.d;
}

describe('roomSize', () => {
  it('width 2–7 tiles (non-decreasing), depth 4–6', () => {
    let previous = 0;
    for (let p = 1; p <= 10; p++) {
      const { w, d } = roomSize(p as Level);
      expect(w).toBeGreaterThanOrEqual(2);
      expect(w).toBeLessThanOrEqual(7);
      expect(w).toBeGreaterThanOrEqual(previous);
      expect(d).toBeGreaterThanOrEqual(4);
      expect(d).toBeLessThanOrEqual(6);
      previous = w;
    }
    expect(ROOM_WIDTH[1]).toBe(2);
    expect(ROOM_WIDTH[10]).toBe(7);
    expect(ROOM_DEPTH[1]).toBe(4);
  });

  it('10 levels = 10 different sizes: the room area grows strictly with the level', () => {
    const sizes = Array.from({ length: 10 }, (_, i) => roomSize((i + 1) as Level));
    for (let p = 1; p < 10; p++) {
      const a = sizes[p - 1]!;
      const b = sizes[p]!;
      expect(b.w * b.d, `level ${p + 1} vs ${p}`).toBeGreaterThan(a.w * a.d);
    }
    expect(new Set(sizes.map((r) => `${r.w}x${r.d}`)).size).toBe(10);
  });
});

describe('floorLayout — properties for 1–20 rooms per floor', () => {
  for (let count = 1; count <= 20; count++) {
    it(`${count} rooms: no collisions, corridors, everything on the slab (50 draws)`, () => {
      for (let seed = 0; seed < 50; seed++) {
        const rnd = prng(count * 1000 + seed);
        const hq = seed % 2 === 0;
        const input = randomFloor(rnd, hq ? 'Headquarters' : 'Floor', count, hq && rnd() < 0.8);
        const l = floorLayout(input, hq);

        expect(l.rooms).toHaveLength(count);
        expect(new Set(l.rooms.map((r) => r.name)).size).toBe(count);
        const rects: Rect[] = [l.core, ...l.rooms];
        for (let i = 0; i < rects.length; i++) {
          expect(contains(l.bounds, rects[i]!)).toBe(true);
          for (let j = i + 1; j < rects.length; j++) {
            expect(overlaps(withCorridor(rects[i]!), withCorridor(rects[j]!))).toBe(false);
          }
        }
        for (const r of l.rooms) {
          expect(r.w).toBe(ROOM_WIDTH[r.level]);
          expect(r.d).toBe(ROOM_DEPTH[r.level]);
          expect(Number.isInteger(r.x) && Number.isInteger(r.z)).toBe(true);
        }
        expect(l.rooms.filter((r) => r.central).length).toBe(hq ? 1 : 0);
      }
    });
  }

  it('rooms in the result keep the file order', () => {
    const input = randomFloor(prng(7), 'X', 9, false);
    expect(floorLayout(input, false).rooms.map((r) => r.name)).toEqual(input.rooms.map((r) => r.name));
  });
});

describe('Headquarters', () => {
  it("the Director's room stands in the middle of Headquarters, on the core axis, in front of the elevator", () => {
    for (let count = 1; count <= 12; count++) {
      const input = randomFloor(prng(count), 'Headquarters', count, true);
      const l = floorLayout(input, true);
      const dir = l.rooms.find((r) => r.name === 'Director')!;
      expect(dir.central).toBe(true);
      const dirCentre = dir.x + dir.w / 2;
      const coreCentre = CORE.x + CORE.w / 2;
      expect(Math.abs(dirCentre - coreCentre)).toBeLessThanOrEqual(0.5);
      expect(dir.z).toBeGreaterThanOrEqual(CORE.z + CORE.d);
    }
  });

  it('without a room named Director the first room of Headquarters takes the middle', () => {
    const l = floorLayout({ name: 'Headquarters', rooms: [{ name: 'A', level: 3 }, { name: 'B', level: 2 }] }, true);
    expect(l.rooms.find((r) => r.central)?.name).toBe('A');
  });

  it('Headquarters is at the bottom regardless of the file order', () => {
    const b = buildingLayout([
      { name: 'Clients', rooms: [{ name: 'k', level: 2 }] },
      { name: 'Headquarters', rooms: [{ name: 'Director', level: 5 }] },
      { name: 'Internal', rooms: [{ name: 'w', level: 1 }] },
    ]);
    expect(b.floors.map((f) => f.name)).toEqual(['Headquarters', 'Clients', 'Internal']);
    expect(b.floors.map((f) => f.inputIndex)).toEqual([1, 0, 2]);
  });
});

describe('buildingLayout', () => {
  it('floors go up, the core stays in place, a storey fits the walls', () => {
    const rnd = prng(42);
    const input = Array.from({ length: 6 }, (_, i) =>
      randomFloor(rnd, i === 0 ? 'Headquarters' : `F${i}`, 1 + Math.floor(rnd() * 20), i === 0),
    );
    const b = buildingLayout(input);
    let y = -1;
    for (const f of b.floors) {
      expect(f.y).toBeGreaterThan(y);
      expect(f.height).toBeGreaterThanOrEqual(3);
      expect(f.core).toEqual(CORE);
      expect(f.bounds.x).toBeGreaterThanOrEqual(b.bounds.minX);
      expect(f.bounds.x + f.bounds.w).toBeLessThanOrEqual(b.bounds.maxX);
      y = f.y;
    }
    const last = b.floors.at(-1)!;
    expect(b.bounds.height).toBeCloseTo(last.y + last.height);
  });

  it('fixture office.md: Headquarters at the bottom, Director in the middle, all rooms laid out', () => {
    const r = parseOffice(sample);
    if (!r.ok) throw new Error('office.md does not validate');
    const b = buildingLayout(r.office.floors);
    expect(b.floors[0]!.name).toBe('Headquarters');
    expect(b.floors[0]!.rooms.some((x) => x.central)).toBe(true);
    const count = r.office.floors.reduce((s, f) => s + f.rooms.length, 0);
    expect(b.floors.reduce((s, f) => s + f.rooms.length, 0)).toBe(count);
  });

  it("the Director's room is DIRECTOR_LEVEL_BONUS levels larger (at most 10)", () => {
    for (const level of [1, 5, 9, 10] as Level[]) {
      const l = floorLayout({ name: 'Headquarters', rooms: [{ name: 'Director', level }, { name: 'Other', level }] }, true);
      const dir = l.rooms.find((r) => r.central)!;
      const expected = Math.min(10, level + DIRECTOR_LEVEL_BONUS) as Level;
      expect(dir.level).toBe(expected);
      expect({ w: dir.w, d: dir.d }).toEqual(roomSize(expected));
      expect(l.rooms.find((r) => !r.central)!.level).toBe(level);
    }
  });

  it('empty input does not throw', () => {
    expect(buildingLayout([]).floors).toEqual([]);
    expect(floorLayout({ name: 'Empty', rooms: [] }, false).rooms).toEqual([]);
  });
});
