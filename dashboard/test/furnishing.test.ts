import { describe, expect, it } from 'vitest';
import { ROOM_DEPTH, ROOM_WIDTH } from '../src/layout';
import { parseOffice } from '../src/parse';
import type { Level } from '../src/level';
import { EXTRA_MODELS, PROP_MODELS } from '../src/models';
import { roomPalette } from '../src/palette';
import { PROPS } from '../src/props';
import {
  themeExtras,
  deskCount,
  standingSpots,
  FIGURE_FOOTPRINT,
  leftWallWindows,
  furnishingWarnings,
  furnishingPlan,
  blocksView,
  type FurnishingPlan,
  type Point,
} from '../src/furnishing';
import sample from './fixtures/office.md?raw';

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Taken floor tiles (desks, chairs, furniture); a rug takes no tile. */
function takenTiles(plan: FurnishingPlan): string[] {
  const k: string[] = [];
  for (const s of plan.workstations) {
    const width = s.big ? 2 : 1;
    for (let i = 0; i < width; i++) k.push(`${s.desk.i + i},${s.desk.j}`);
    k.push(`${Math.floor(s.chair.x)},${Math.floor(s.chair.z)}`);
  }
  for (const m of plan.furniture) for (let i = 0; i < m.width; i++) k.push(`${m.i + i},${m.j}`);
  // Tiles reserved for agents without a desk (two figures on one tile count once).
  k.push(...new Set(plan.standing.map((p) => `${Math.floor(p.x)},${Math.floor(p.z)}`)));
  return k;
}

const PALETTE = roomPalette([]);
const ALL_MODELS = { ...PROP_MODELS, ...EXTRA_MODELS } as Record<string, (typeof PROP_MODELS)['desk']>;
function modelHeight(name: string): number {
  return Math.max(...ALL_MODELS[name]!.build(PALETTE, 0).map((k) => k.y + k.h));
}

/** Everything that actually stands or hangs in the room (with repetitions). */
function placed(plan: FurnishingPlan): string[] {
  const n = [...plan.furniture, ...plan.rugs].map((m) => m.name).concat(plan.walls.map((s) => s.name));
  for (const s of plan.workstations) {
    if (s.equipment) n.push(s.equipment);
    if (s.gadget) n.push(s.gadget);
  }
  if (plan.workstations.some((s) => s.big)) n.push('big-desk');
  n.push('desk');
  return n;
}

/** Figure positions when everyone is in place (sitting, standing). */
function planFigures(plan: FurnishingPlan, count: number): { sitting: Point[]; standing: Point[] } {
  const ws = [...plan.workstations].sort((a, b) => Number(b.big) - Number(a.big)).slice(0, count);
  return { sitting: ws.map((s) => ({ x: s.chair.x, z: s.chair.z - 0.15 })), standing: plan.standing };
}

function collide(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 2 * FIGURE_FOOTPRINT.halfX - 1e-9 && Math.abs(a.z - b.z) < 2 * FIGURE_FOOTPRINT.halfZ - 1e-9;
}

function checkPlan(plan: FurnishingPlan): void {
  const tiles = takenTiles(plan);
  // No furniture collisions and everything inside the room.
  expect(new Set(tiles).size).toBe(tiles.length);
  for (const k of tiles) {
    const [i, j] = k.split(',').map(Number) as [number, number];
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(plan.w);
    expect(j).toBeGreaterThanOrEqual(0);
    expect(j).toBeLessThan(plan.d);
  }
  // The aisle (except the target in column 0) and the spot at the target are free (figures walk there).
  for (let i = 1; i < plan.w; i++) expect(tiles).not.toContain(`${i},${plan.aisle}`);
  for (const m of plan.furniture.filter((x) => x.j === plan.aisle)) expect(m.i).toBe(0);
  expect(tiles).not.toContain(`${Math.floor(plan.target.x)},${Math.floor(plan.target.z)}`);
  // No tall furniture under a wall decoration (corner (0, 0) for slots 0, tile (0, j) for the left wall).
  const furnitureAt = (i: number, j: number) => plan.furniture.find((m) => m.j === j && m.i <= i && i < m.i + m.width);
  for (const s of plan.walls) {
    const under = s.wall === 'left' ? furnitureAt(0, s.position) : s.position === 0 ? furnitureAt(0, 0) : undefined;
    if (under) expect(modelHeight(under.name), `${s.name} above ${under.name}`).toBeLessThanOrEqual(11);
  }
  // Walls: one item per slot, windows and items on the left wall do not overlap.
  const slots = plan.walls.map((s) => `${s.wall}:${s.position}`);
  expect(new Set(slots).size).toBe(slots.length);
  for (const s of plan.walls) {
    if (s.wall === 'left') {
      expect(plan.leftWindows).not.toContain(s.position);
      expect(s.position).toBeLessThan(plan.d);
    } else {
      expect(s.position).toBeGreaterThanOrEqual(0);
      expect(s.position).toBeLessThan(plan.w);
    }
  }
}

describe('deskCount', () => {
  it('grows (non-decreasing) with the level: 1,1,2,2,3,3,4,5,6,6', () => {
    expect(LEVELS.map((p) => deskCount(p))).toEqual([1, 1, 2, 2, 3, 3, 4, 5, 6, 6]);
  });

  it.each(LEVELS)('level %i: that many desks in the plan and they fit in the room', (level) => {
    const plan = furnishingPlan({ name: 'x', level, props: [] });
    expect(plan.workstations).toHaveLength(deskCount(level));
    expect(plan.w).toBe(ROOM_WIDTH[level]);
    expect(plan.d).toBe(ROOM_DEPTH[level]);
    expect(plan.workstations.every((s) => !s.big && s.equipment === 'monitor')).toBe(true);
    checkPlan(plan);
  });

  it('a big desk replaces one workstation and takes 2 columns; in a room of width 2 it is skipped', () => {
    const p5 = furnishingPlan({ name: 'Director', level: 5, props: ['big-desk'] });
    expect(p5.workstations.filter((s) => s.big)).toHaveLength(1);
    expect(p5.workstations.length).toBeLessThanOrEqual(deskCount(5));
    checkPlan(p5);
    const p1 = furnishingPlan({ name: 'Small', level: 1, props: ['big-desk'] });
    expect(p1.workstations.some((s) => s.big)).toBe(false);
    expect(p1.skipped).toContain('big-desk');
    checkPlan(p1);
  });
});

describe('furnishingPlan', () => {
  it('every prop alone, at every level: a plan without collisions', () => {
    for (const level of LEVELS) {
      for (const r of PROPS) checkPlan(furnishingPlan({ name: r, level, props: [r] }));
    }
  });

  it('all props at once: a plan without collisions, the excess goes to "skipped"', () => {
    for (const level of LEVELS) {
      const plan = furnishingPlan({ name: 'everything', level, props: PROPS, theme: 'shop, newsroom, photo studio, classroom' });
      checkPlan(plan);
      const present = placed(plan);
      // Every prop is either in the room or explicitly skipped for lack of space.
      for (const r of PROPS) expect(present.includes(r) || plan.skipped.includes(r), `${level}: ${r}`).toBe(true);
    }
  });

  it('unknown prop names are ignored (no exception)', () => {
    expect(() => furnishingPlan({ name: 'x', level: 3, props: ['something-new', 'plant'] })).not.toThrow();
  });

  it('the kanban board is the walk target: in the aisle at the left wall, facing the room', () => {
    const plan = furnishingPlan({ name: 'x', level: 6, props: ['plant', 'kanban-board'] });
    expect(plan.furniture.find((m) => m.i === 0 && m.j === plan.aisle)).toMatchObject({ name: 'kanban-board', rotation: 1 });
    expect(plan.target).toEqual({ x: 1.5, z: plan.aisle + 0.5 });
    expect(plan.targetFacing).toBe(3);
  });

  it('tall furniture stands at the back by the left wall, low furniture at the front', () => {
    const plan = furnishingPlan({ name: 'x', level: 8, props: ['kanban-board', 'server', 'plant', 'parcels'] });
    expect(plan.furniture.find((m) => m.name === 'server')).toMatchObject({ i: 0, j: 0 });
    expect(plan.furniture.find((m) => m.name === 'parcels')!.j).toBeGreaterThanOrEqual(3);
  });

  it('equipment and gadgets from the props go onto the desks', () => {
    const plan = furnishingPlan({ name: 'x', level: 7, props: ['laptop', 'dual-monitors', 'mug'] });
    expect(new Set(plan.workstations.map((s) => s.equipment))).toEqual(new Set(['laptop', 'dual-monitors']));
    expect(plan.workstations.some((s) => s.gadget === 'mug')).toBe(true);
  });

  it('is deterministic', () => {
    const input = { name: 'Website', level: 9 as Level, props: ['server', 'globe', 'sofa', 'poster'] };
    expect(furnishingPlan(input)).toEqual(furnishingPlan(input));
  });

  it('rooms from the office.md fixture: no collisions, all props and theme extras in the room', () => {
    const r = parseOffice(sample);
    if (!r.ok) throw new Error('office.md does not validate');
    for (const room of r.office.floors.flatMap((f) => f.rooms)) {
      const plan = furnishingPlan({
        name: room.name,
        level: room.level,
        props: room.props,
        theme: room.theme,
        agentCount: room.agents.length,
      });
      checkPlan(plan);
      expect(plan.skipped, room.name).toEqual([]);
      expect(plan.agentsWithoutPlace, room.name).toBe(0);
      const present = placed(plan);
      for (const p of room.props) expect(present, `${room.name}: ${p}`).toContain(p);
      // Theme extras with repetitions (e.g. two diplomas) must be in the room too.
      const extras = themeExtras(room.theme);
      for (const extra of new Set(extras)) {
        const want = extras.filter((x) => x === extra).length;
        const have = present.filter((x) => x === extra).length;
        expect(have, `${room.name}: ${extra}`).toBeGreaterThanOrEqual(want);
      }
    }
  });

  it('a level-1 room (2×4): two diplomas from the theme, a trophy and a bookshelf', () => {
    const plan = furnishingPlan({
      name: 'portfolio',
      level: 1,
      props: ['desk', 'trophy', 'bookshelf', 'laptop'],
      theme: 'study with diplomas and certificates',
      agentCount: 1,
    });
    expect(plan.skipped).toEqual([]);
    expect(plan.walls.filter((s) => s.name === 'diploma')).toHaveLength(2);
    expect(plan.walls.map((s) => s.name)).toContain('trophy');
    checkPlan(plan);
  });

  it('theme extras take priority over wall props', () => {
    const plan = furnishingPlan({
      name: 'cramped',
      level: 1,
      props: ['poster', 'world-map', 'cork-board', 'calendar', 'trophy', 'kanban-board'],
      theme: 'study with diplomas',
    });
    expect(plan.walls.filter((s) => s.name === 'diploma')).toHaveLength(2);
    expect(plan.skipped.length).toBeGreaterThan(0);
    expect(plan.skipped).not.toContain('diploma');
  });
});

describe('agents without a desk', () => {
  const SETS: ReadonlyArray<{ label: string; props: readonly string[]; theme?: string }> = [
    { label: 'empty', props: [] },
    { label: 'director', props: ['big-desk', 'world-map', 'kanban-board', 'bookshelf', 'plant'] },
    { label: 'full', props: ['sofa', 'server', 'globe', 'parcels', 'printer', 'kanban-board'], theme: 'shop, classroom' },
    { label: 'everything', props: PROPS, theme: 'shop, newsroom, classroom, diplomas' },
  ];

  it('every level, 1–6 agents: all in the room, no collisions, outside the aisle, the target and the view of the director', () => {
    for (const level of LEVELS) {
      for (const z of SETS) {
        for (let n = 1; n <= 6; n++) {
          const plan = furnishingPlan({ name: `${z.label}-${n}`, level, props: z.props, theme: z.theme, agentCount: n });
          const label = `level ${level}, ${z.label}, ${n} agents`;
          checkPlan(plan);
          const { sitting, standing } = planFigures(plan, n);
          expect(plan.agentsWithoutPlace, label).toBe(0);
          expect(sitting.length + standing.length, label).toBe(n);
          const everyone = [...sitting, ...standing, plan.target];
          for (const p of everyone) {
            expect(p.x - FIGURE_FOOTPRINT.halfX, label).toBeGreaterThanOrEqual(0);
            expect(p.x + FIGURE_FOOTPRINT.halfX, label).toBeLessThanOrEqual(plan.w);
            expect(p.z - FIGURE_FOOTPRINT.halfZ, label).toBeGreaterThanOrEqual(0);
            expect(p.z + FIGURE_FOOTPRINT.halfZ, label).toBeLessThanOrEqual(plan.d);
          }
          for (let a = 0; a < everyone.length; a++) {
            for (let b = a + 1; b < everyone.length; b++) {
              expect(collide(everyone[a]!, everyone[b]!), `${label}: ${JSON.stringify([everyone[a], everyone[b]])}`).toBe(false);
            }
          }
          const director = plan.workstations.find((s) => s.big);
          for (const p of standing) {
            // Outside the aisle (at the front) or in the back-left corner, away from the walking route.
            const atFront = p.z - FIGURE_FOOTPRINT.halfZ >= plan.aisle + 1;
            const inCorner = p.x + FIGURE_FOOTPRINT.halfX <= 1 && p.z + FIGURE_FOOTPRINT.halfZ <= plan.aisle;
            expect(atFront || inCorner, `${label}: ${JSON.stringify(p)}`).toBe(true);
            if (director) expect(blocksView(p, { x: director.chair.x, z: director.chair.z - 0.15 }), label).toBe(false);
          }
        }
      }
    }
  });

  it('nobody stands at the walk target; with 1–2 standing, the tiles next to the target stay free when there is a choice', () => {
    for (const level of LEVELS) {
      const plan = furnishingPlan({ name: 'x', level, props: ['kanban-board'], agentCount: 6 });
      for (const p of plan.standing) expect(Math.hypot(p.x - plan.target.x, p.z - plan.target.z)).toBeGreaterThanOrEqual(0.75);
    }
    // Level 6 (4×5): enough tiles at the front, so two standing agents are more than a tile away from the target.
    const plan = furnishingPlan({ name: 'x', level: 6, props: ['kanban-board'], agentCount: 5 });
    expect(plan.standing).toHaveLength(2);
    for (const p of plan.standing) expect(Math.hypot(p.x - plan.target.x, p.z - plan.target.z)).toBeGreaterThanOrEqual(1.5);
  });

  it('standingSpots: 0 agents → no spots; overflow beyond capacity is reported', () => {
    expect(standingSpots(2, 4, 0, { x: 1.5, z: 2.5 }).standing).toEqual([]);
    const m = standingSpots(2, 4, 20, { x: 1.5, z: 2.5 });
    expect(m.standing.length + m.overflow).toBe(20);
    expect(m.overflow).toBeGreaterThan(0);
  });
});

describe('furnishingWarnings', () => {
  it('office.md fixture: no warnings (everything fits in the rooms)', () => {
    const r = parseOffice(sample);
    if (!r.ok) throw new Error('office.md does not validate');
    expect(furnishingWarnings(r.office)).toEqual([]);
  });

  it('a prop that does not fit goes to the warning list with the room name', () => {
    const md = [
      '# Office',
      '> updated: 2026-11-13 08:00 · test',
      '',
      '## Floor: Projects',
      '',
      '### Room: Cramped',
      '- repo: a/b · open: 0',
      '- agents: developer',
      '- theme: study with diplomas',
      '- props: poster, world-map, cork-board, calendar, trophy, kanban-board',
      '',
    ].join('\n');
    const r = parseOffice(md);
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const w = furnishingWarnings(r.office);
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('Cramped');
  });
});

describe('themeExtras', () => {
  it.each([
    ['classroom with a times table', 'chalkboard'],
    ['bright food photography studio', 'camera'],
    ['school maths club', 'chalkboard'],
    ['product photos', 'camera'],
    ['shop for families with children', 'cash-register'],
    ['newsroom of an AI news site', 'newspapers'],
    ['study with diplomas and certificates', 'diploma'],
    ['library of migration procedures', 'bookshelf'],
    ['tidy server room', 'server'],
  ])('"%s" → %s', (theme, extra) => {
    expect(themeExtras(theme)).toContain(extra);
  });

  it('theme extras have models', () => {
    const known = new Set([...Object.keys(PROP_MODELS), ...Object.keys(EXTRA_MODELS)]);
    const all = themeExtras('classroom shop photography newsroom diploma library server room');
    expect(all.length).toBeGreaterThanOrEqual(8);
    for (const d of all) expect(known.has(d), d).toBe(true);
  });

  it.each(['classic study', 'a classy lounge', 'development studio', 'client portal with a dashboard', 'storage room'])(
    'no false positives: "%s" → no extras',
    (theme) => {
      expect(themeExtras(theme)).toEqual([]);
    },
  );

  it('no theme → no extras', () => {
    expect(themeExtras(undefined)).toEqual([]);
    expect(themeExtras('empty room')).toEqual([]);
  });
});

describe('leftWallWindows', () => {
  it('windows in rows 1 and 3 (if the room is deep enough)', () => {
    expect(leftWallWindows(4)).toEqual([1, 3]);
    expect(leftWallWindows(3)).toEqual([1]);
  });
});
