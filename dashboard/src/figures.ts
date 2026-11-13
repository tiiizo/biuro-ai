// Figures (agents from `agents:`): look by role and the animation plan. Pure functions, tests in
// test/figures.test.ts.
import { hash } from './palette';

/** Outfit color by role. Role = the agent name or its first part (developer-web → developer). */
export const ROLE_COLORS: Readonly<Record<string, string>> = {
  director: '#2c2e47',
  developer: '#3b82f6',
  'product-owner': '#ffb703',
  marketing: '#ff5d8f',
  reviewer: '#2a9d8f',
  researcher: '#8338ec',
  'office-manager': '#f77f00',
  translator: '#0fc79a',
  finance: '#588157',
  strategist: '#9d4edd',
};

const OTHER_COLORS = ['#e76f51', '#457b9d', '#6a994e', '#bc6c25', '#7209b7', '#0081a7'];
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#f3d1b0'];
const HAIR = ['#2b1d14', '#5a3825', '#a0522d', '#e6c27a', '#1d1d1d', '#8c8c8c', '#b5523b'];

export function agentRole(name: string): string {
  const n = name.trim().toLowerCase();
  if (ROLE_COLORS[n]) return n;
  const first = n.split('-')[0]!;
  return ROLE_COLORS[first] ? first : n;
}

export type Look = { role: string; outfit: string; skin: string; hair: string; trousers: string; longHair: boolean };

export function figureLook(name: string): Look {
  const role = agentRole(name);
  const h = hash(name);
  const outfit = ROLE_COLORS[role] ?? OTHER_COLORS[h % OTHER_COLORS.length]!;
  return {
    role,
    outfit,
    skin: SKIN[(h >>> 3) % SKIN.length]!,
    hair: HAIR[(h >>> 7) % HAIR.length]!,
    trousers: role === 'director' ? '#1d1b29' : (h >>> 11) % 2 === 0 ? '#34405a' : '#4a4e69',
    longHair: ((h >>> 13) & 1) === 1,
  };
}

// --- Animation: sits at the desk → walks to the board → stands → walks back ---

export type Point = { x: number; z: number };
export type Pose = 'sitting' | 'walking' | 'standing';
/** Facing: 0 = +z (towards the camera), 1 = +x, 2 = −z (towards the back wall), 3 = −x. */
export type Facing = 0 | 1 | 2 | 3;
export type FigureState = { x: number; z: number; pose: Pose; facing: Facing; step: 0 | 1 };

export type MotionPlan = {
  /** Chair (start and end of the cycle). */
  start: Point;
  /** Waypoints and the target (last point), e.g. aisle → target column → at the board. */
  route: Point[];
  sit: number;
  stand: number;
  /** Phase shift (s), so the figures do not walk in step. */
  phase: number;
  /** Speed (tiles/s). */
  speed: number;
  /** Facing at the target. */
  targetFacing: Facing;
};

export function motionPlan(name: string, chair: Point, aisleZ: number, target: Point, targetFacing: Facing = 2): MotionPlan {
  const h = hash(name);
  return {
    start: chair,
    route: [
      { x: chair.x, z: aisleZ },
      { x: target.x, z: aisleZ },
      target,
    ],
    sit: 9 + (h % 7),
    stand: 3 + ((h >>> 4) % 3),
    phase: (h >>> 8) % 17,
    speed: 1.1,
    targetFacing,
  };
}

function distance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

function facingOf(a: Point, b: Point): Facing {
  if (Math.abs(b.x - a.x) > Math.abs(b.z - a.z)) return b.x > a.x ? 1 : 3;
  return b.z > a.z ? 0 : 2;
}

/** Segments of the way there (start → target), without zero-length segments. */
function segments(plan: MotionPlan): Array<[Point, Point]> {
  const points = [plan.start, ...plan.route];
  const result: Array<[Point, Point]> = [];
  for (let i = 0; i + 1 < points.length; i++) {
    if (distance(points[i]!, points[i + 1]!) > 1e-6) result.push([points[i]!, points[i + 1]!]);
  }
  return result;
}

export function cycleTime(plan: MotionPlan): number {
  const way = segments(plan).reduce((s, [a, b]) => s + distance(a, b), 0);
  return plan.sit + plan.stand + (2 * way) / plan.speed;
}

function onRoute(seg: Array<[Point, Point]>, dist: number): { p: Point; k: Facing } {
  let rest = dist;
  for (const [a, b] of seg) {
    const l = distance(a, b);
    if (rest <= l) {
      const t = l === 0 ? 1 : rest / l;
      return { p: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, k: facingOf(a, b) };
    }
    rest -= l;
  }
  const last = seg.at(-1);
  return last ? { p: last[1], k: facingOf(last[0], last[1]) } : { p: { x: 0, z: 0 }, k: 0 };
}

/** Figure state at time t (s). Deterministic and periodic: state(t) = state(t + cycleTime). */
export function figureState(plan: MotionPlan, t: number): FigureState {
  const seg = segments(plan);
  const way = seg.reduce((s, [a, b]) => s + distance(a, b), 0);
  const walk = way / plan.speed;
  const cycle = cycleTime(plan);
  const c = (((t + plan.phase) % cycle) + cycle) % cycle;
  const step = (Math.floor(c * 4) % 2) as 0 | 1;
  if (c < plan.sit || way === 0) return { ...plan.start, pose: 'sitting', facing: 2, step: 0 };
  let u = c - plan.sit;
  if (u < walk) {
    const { p, k } = onRoute(seg, u * plan.speed);
    return { ...p, pose: 'walking', facing: k, step };
  }
  u -= walk;
  if (u < plan.stand) {
    const target = plan.route.at(-1)!;
    // At the board: looks at it.
    return { ...target, pose: 'standing', facing: plan.targetFacing, step: 0 };
  }
  u -= plan.stand;
  const back = seg.map(([a, b]) => [b, a] as [Point, Point]).reverse();
  const { p, k } = onRoute(back, Math.min(way, u * plan.speed));
  return { ...p, pose: 'walking', facing: k, step };
}
