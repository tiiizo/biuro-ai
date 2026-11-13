// Room furnishing plan: a pure function (no three), tested in test/furnishing.test.ts.
//
// Room grid in tiles: i = column (0 at the left wall), j = row (0 at the back wall).
//   j = 0      desks (columns 1..w-1); (0, 0) and (0, 1) are spots for tall furniture (bookshelf, server),
//   j = 1      chairs,
//   j = 2      aisle: the figures walk here. At (0, 2) stands the walk "target" (a kanban board or another
//              piece of furniture) facing the room; a figure stops next to it at (1, 2). The target is at the
//              front, because the back of the room is sometimes hidden by the slab of the floor above,
//   j = 3..d-1 zone for furniture and props (sofa, plant…) and for agents without a desk.
// Walls: back (first above the desks, columns 1..w-1), left (windows in rows 1 and 3; slot 2 only above a
// low target; slots from 4 onwards), finally the corner (back 0 and left 0 above tile (0, 0)).
// Priority: agents (everyone gets a place in the room) → theme extras → props from `props:` → fillers
// (plant, bin, clock). Whatever does not fit goes to `skipped` and to the dashboard warning list
// (furnishingWarnings).
import { ROOM_DEPTH, ROOM_WIDTH, buildingLayout, type RoomLayout } from './layout';
import type { Level } from './level';
import { EXTRA_MODELS, PROP_MODELS, type Model } from './models';
import { roomPalette, hash } from './palette';
import type { Office, Room } from './schema';

/** Palette used only to measure model heights (the shape does not depend on colors). */
const MEASURING_PALETTE = roomPalette([]);

export type Cell = { i: number; j: number };

/** `rotation` 1 = model front towards +x (furniture at the left wall faces into the room). */
export type Placement = { name: string; i: number; j: number; width: number; variant: number; rotation: 0 | 1 };

export type OnWall = { name: string; wall: 'back' | 'left'; position: number; variant: number };

export type Workstation = {
  /** Left column of the desk (a big desk takes 2 columns). */
  desk: Cell;
  big: boolean;
  /** Centre of the chair (may be fractional for a big desk). */
  chair: { x: number; z: number };
  /** Equipment on the desk (monitor, dual monitors, laptop); none for a big desk. */
  equipment?: string;
  /** Small item on the desk (mug, phone, cactus, router). */
  gadget?: string;
};

export type FurnishingPlan = {
  w: number;
  d: number;
  workstations: Workstation[];
  furniture: Placement[];
  rugs: Placement[];
  walls: OnWall[];
  /** Rows with windows on the left wall. */
  leftWindows: number[];
  /** Centre of the spot next to the target (board) where the figures walk. */
  target: { x: number; z: number };
  /** Facing at the target (3 = −x, towards a board at the left wall). */
  targetFacing: 0 | 1 | 2 | 3;
  /** Aisle row. */
  aisle: number;
  /** Props that did not fit (e.g. the room is too small). */
  skipped: string[];
  /** Spots of agents without a desk (figure centres), in assignment order. */
  standing: Point[];
  /** Agents for whom there was no room (0 for rooms with up to 6 agents at every level). */
  agentsWithoutPlace: number;
};

export type Point = { x: number; z: number };

export type FurnishingInput = {
  name: string;
  level: Level;
  props: readonly string[];
  theme?: string | undefined;
  central?: boolean;
  /** Number of agents in the room (agents beyond the number of workstations stand in the front zone). */
  agentCount?: number;
};

/** Number of desks (workstations) by level: grows with the level, 1–6 (room width − 1). */
export function deskCount(level: Level): number {
  return ROOM_WIDTH[level] - 1;
}

/** Window rows on the left (outer) wall of a room of depth d. */
export function leftWallWindows(d: number): number[] {
  return [1, 3].filter((j) => j < d);
}

/**
 * Extras that follow from the theme (keywords), so the furnishing reflects the project. Plain words like
 * "studio" or "portal" are not enough (e.g. a development studio, a client portal).
 */
const THEME_EXTRAS: ReadonlyArray<[RegExp, readonly string[]]> = [
  [/classroom|\bschool|\blessons?\b|\bteach|\bmaths?\b|\btutor/i, ['chalkboard']],
  [/\bphoto|\bcamera/i, ['camera']],
  [/\bshop|\bstore\b|e-?commerce|checkout/i, ['cash-register']],
  [/newsroom|newspaper|editorial|magazine|\bnews\b/i, ['newspapers']],
  [/diploma|certificat/i, ['diploma', 'diploma']],
  [/\blibrar|\bprocedure|handbook/i, ['bookshelf']],
  [/server room|data cent/i, ['server']],
];

export function themeExtras(theme: string | undefined): string[] {
  if (!theme) return [];
  return THEME_EXTRAS.flatMap(([re, extras]) => (re.test(theme) ? [...extras] : []));
}

const ALL: ReadonlyMap<string, Model> = new Map<string, Model>([
  ...Object.entries(PROP_MODELS),
  ...Object.entries(EXTRA_MODELS),
]);

/** Order of picking the walk "target" when the room has no kanban board. */
const TARGETS = ['kanban-board', 'coffee-machine', 'bookshelf', 'server', 'printer', 'file-cabinet', 'binders', 'aquarium', 'globe'];
const FILLERS = ['plant', 'bin'];

/** The tallest furniture (in voxels) above which a wall decoration can hang (bottom edge ~11.5 voxels). */
const DECOR_BOTTOM = 11;

const heights = new Map<string, number>();
/** Model height in voxels (for decisions: tall furniture at the back, decoration above furniture). */
function height(name: string): number {
  let h = heights.get(name);
  if (h === undefined) {
    h = Math.max(...ALL.get(name)!.build(MEASURING_PALETTE, 0).map((k) => k.y + k.h));
    heights.set(name, h);
  }
  return h;
}

/** Footprint of a standing figure in tiles (arms out: 6 voxels, head in depth: ~3 voxels). */
export const FIGURE_FOOTPRINT = { halfX: 0.375, halfZ: 0.2 } as const;

/**
 * Whether a figure at point `p` hides a person at point `o` from the camera. The camera looks from the
 * front-right (azimuth 45°), so horizontally on screen x − z matters, and "in front" means larger x + z.
 * Threshold 1.2 = the on-screen width of two figures with a margin.
 */
export function blocksView(p: Point, o: Point): boolean {
  return p.x + p.z > o.x + o.z && Math.abs(p.x - p.z - (o.x - o.z)) < 1.2;
}

/**
 * Spots for agents without a desk: tiles of the front zone (row 3 and further), and when they run out — the
 * back-left corner (0, 1), (0, 0). Never in the aisle (agents from the desks walk there), never at the walk
 * target, never in the line of sight to the director at the big desk. First one figure per tile; when
 * there are more agents than tiles, two per tile (one behind the other). A pure function.
 */
export function standingSpots(
  w: number,
  d: number,
  count: number,
  target: Point,
  director?: Point,
): { standing: Point[]; tiles: Cell[]; overflow: number } {
  const centre = (c: Cell): Point => ({ x: c.i + 0.5, z: c.j + 0.5 });
  const fromTarget = (c: Cell) => Math.hypot(centre(c).x - target.x, centre(c).z - target.z);
  const front: Cell[] = [];
  for (let j = 3; j < d; j++) for (let i = w - 1; i >= 0; i--) front.push({ i, j });
  // Further from the target first (stable: rows from the aisle, columns from the right).
  front.sort((a, b) => Number(fromTarget(a) < 1.5) - Number(fromTarget(b) < 1.5));
  const candidates = [...front, { i: 0, j: 1 }, { i: 0, j: 0 }].filter(
    (c) => !director || !blocksView(centre(c), director),
  );
  const single = Math.min(count, candidates.length);
  const double = Math.min(Math.max(0, count - candidates.length), candidates.length);
  const standing: Point[] = [];
  const tiles = candidates.slice(0, single);
  tiles.forEach((c, k) => {
    if (k < double) standing.push({ x: c.i + 0.5, z: c.j + 0.27 }, { x: c.i + 0.5, z: c.j + 0.77 });
    else standing.push(centre(c));
  });
  return { standing, tiles, overflow: count - standing.length };
}

export function furnishingPlan(p: FurnishingInput): FurnishingPlan {
  const w = ROOM_WIDTH[p.level];
  const d = ROOM_DEPTH[p.level];
  const seed = hash(p.name);
  const skipped: string[] = [];
  const unique = [...new Set(p.props)].filter((n) => ALL.has(n));
  const model = (n: string) => ALL.get(n)!;
  const withSpot = (list: readonly string[], s: Model['spot']) => list.filter((n) => model(n).spot === s);

  // --- Workstations ---
  const workstations: Workstation[] = [];
  let count = deskCount(p.level);
  let col = 1;
  const wantsBig = unique.includes('big-desk');
  if (wantsBig) {
    if (w - 1 >= 2) {
      // Big desk on the right, by the wall: 2 columns, one workstation.
      workstations.push({ desk: { i: w - 2, j: 0 }, big: true, chair: { x: w - 1, z: 1.5 } });
      count = Math.min(count - 1, w - 3);
    } else {
      skipped.push('big-desk');
    }
  }
  const equipment = withSpot(unique, 'equipment');
  const gadgets = withSpot(unique, 'desk');
  for (let n = 0; n < count; n++, col++) {
    workstations.push({ desk: { i: col, j: 0 }, big: false, chair: { x: col + 0.5, z: 1.5 } });
  }
  workstations.sort((a, b) => a.desk.i - b.desk.i);
  let r = 0;
  workstations.forEach((s, idx) => {
    if (s.big) return;
    s.equipment = equipment.length > 0 ? equipment[r % equipment.length]! : 'monitor';
    if (gadgets.length > 0 && (idx % 2 === 0 || gadgets.length > 1)) s.gadget = gadgets[r % gadgets.length]!;
    r++;
  });
  // Equipment and gadgets that ran out of desks are reported as skipped too.
  const onDesks = new Set(workstations.flatMap((s) => [s.equipment, s.gadget]));
  for (const n of [...equipment, ...gadgets]) if (!onDesks.has(n)) skipped.push(n);

  // --- Agents without a desk: their spots are reserved before furniture, so every agent is in the room ---
  const taken = new Set<string>();
  const key = (i: number, j: number) => `${i},${j}`;
  const target: Point = { x: 1.5, z: 2.5 };
  const big = workstations.find((s) => s.big);
  const directorView = big ? { x: big.chair.x, z: big.chair.z - 0.15 } : undefined;
  const { standing, tiles: standingTiles, overflow } = standingSpots(
    w,
    d,
    Math.max(0, (p.agentCount ?? 0) - workstations.length),
    target,
    directorView,
  );
  for (const k of standingTiles) taken.add(key(k.i, k.j));

  // --- Floor furniture (theme extras before props) ---
  const extras = themeExtras(p.theme);
  const floorItems = [
    ...withSpot(extras, 'floor').filter((n) => !unique.includes(n)),
    ...withSpot(unique, 'floor').filter((n) => n !== 'desk' && n !== 'big-desk'),
  ];
  const furniture: Placement[] = [];

  // Target in the aisle at the left wall (a board or another piece to "visit"), facing the room.
  const targetName =
    TARGETS.find((c) => floorItems.includes(c) && model(c).width === 1) ?? floorItems.find((n) => model(n).width === 1);
  if (targetName) {
    furniture.push({ name: targetName, i: 0, j: 2, width: 1, variant: seed % 4, rotation: 1 });
    floorItems.splice(floorItems.indexOf(targetName), 1);
  }

  // --- Walls (before furniture: a picture in the corner blocks tall furniture there, not the other way round) ---
  const leftWindows = leftWallWindows(d);
  // First the middle of the back wall above the desks (best visible), then the left wall, finally the corner.
  const backSlots = Array.from({ length: w - 1 }, (_, k) => k + 1).sort((a, b) => Math.abs(a - w / 2) - Math.abs(b - w / 2));
  const leftSlots: number[] = [];
  for (let j = 2; j < d; j++) {
    if (leftWindows.includes(j)) continue;
    if (j === 2 && targetName && height(targetName) > DECOR_BOTTOM) continue;
    leftSlots.push(j);
  }
  const slots: Array<{ wall: 'back' | 'left'; position: number }> = [
    ...backSlots.map((position) => ({ wall: 'back' as const, position })),
    ...leftSlots.map((position) => ({ wall: 'left' as const, position })),
    { wall: 'back', position: 0 },
    { wall: 'left', position: 0 },
  ];
  const wallItems = [...withSpot(extras, 'wall'), ...withSpot(unique, 'wall')];
  const walls: OnWall[] = [];
  wallItems.forEach((name, idx) => {
    // A project window only on the back wall (the left wall already has windows).
    const s = slots.findIndex((x) => name !== 'window' || (x.wall === 'back' && x.position !== 0));
    if (s < 0) {
      skipped.push(name);
      return;
    }
    const [slot] = slots.splice(s, 1);
    walls.push({ name, wall: slot!.wall, position: slot!.position, variant: (seed + idx) % 4 });
  });
  // No tall furniture under a wall decoration (it would hide it): tile (0, j) under the left wall,
  // tile (0, 0) under the corner.
  const underDecor = new Set(
    walls.filter((s) => s.wall === 'left' || s.position === 0).map((s) => key(0, s.wall === 'left' ? s.position : 0)),
  );

  // Furniture zone: rows 3..d-1, from the edges towards the middle (the middle stays looser), plus the
  // back-left corner (0, 0), (0, 1). Tall furniture goes to the back first (it does not hide the room),
  // the rest to the front first (the back is sometimes hidden by the slab of the floor above).
  const columns: number[] = [];
  for (let a = 0, b = w - 1; a <= b; a++, b--) {
    columns.push(a);
    if (b !== a) columns.push(b);
  }
  const front: Cell[] = [];
  for (let j = 3; j < d; j++) for (const i of columns) front.push({ i, j });
  const back: Cell[] = [{ i: 0, j: 0 }, { i: 0, j: 1 }];
  const tall = (n: string) => height(n) > 10;
  const cells = [...front, ...back];

  const place = (name: string, variant: number): boolean => {
    const width = model(name).width;
    const order = tall(name) ? [...back, ...front] : cells;
    for (const c of order) {
      if (c.i + width > w) continue;
      // The back corner has desks next to it: only single-tile furniture.
      if (width > 1 && back.includes(c)) continue;
      if (underDecor.has(key(c.i, c.j)) && height(name) > DECOR_BOTTOM) continue;
      const free = Array.from({ length: width }, (_, k) => key(c.i + k, c.j)).every((k) => !taken.has(k));
      if (!free) continue;
      for (let k = 0; k < width; k++) taken.add(key(c.i + k, c.j));
      furniture.push({ name, i: c.i, j: c.j, width, variant, rotation: c.i === 0 && width === 1 ? 1 : 0 });
      return true;
    }
    return false;
  };
  floorItems.forEach((n, idx) => {
    if (!place(n, (seed + idx) % 4)) skipped.push(n);
  });
  // Fillers: at most two, so the room is neither empty nor cluttered.
  let free = cells.filter((c) => !taken.has(key(c.i, c.j))).length;
  for (let n = 0; n < 2 && free > 1; n++, free--) place(FILLERS[(seed + n) % FILLERS.length]!, n);

  // --- Rug in the aisle ---
  const rugs: Placement[] = [];
  if ((unique.includes('rug') || p.central) && w >= 2) {
    rugs.push({ name: 'rug', i: Math.floor((w - 2) / 2), j: 2, width: 2, variant: 0, rotation: 0 });
  }

  // A clock on a free wall when a lot of space is left (not in the corner).
  const freeSlots = slots.filter((x) => x.position !== 0);
  if (freeSlots.length >= 3) {
    const slot = freeSlots.at(-1)!;
    walls.push({ name: 'clock', wall: slot.wall, position: slot.position, variant: 0 });
  }

  return {
    w,
    d,
    workstations,
    furniture,
    rugs,
    walls,
    leftWindows,
    target,
    targetFacing: 3,
    aisle: 2,
    skipped,
    standing,
    agentsWithoutPlace: overflow,
  };
}

/** Plan input for a scene room (shared by the scene and the warning list, so the plan is the same). */
export function furnishingInput(room: Room, layout: Pick<RoomLayout, 'level' | 'central'>): FurnishingInput {
  return {
    name: room.name,
    level: layout.level,
    props: room.props,
    theme: room.theme,
    central: layout.central,
    agentCount: room.agents.length,
  };
}

/**
 * Furnishing warnings for the list in the dashboard header: props (also from the theme) that did not fit in
 * the room, and agents without a place. An empty list = everything stands in the rooms.
 */
export function furnishingWarnings(office: Office): string[] {
  const result: string[] = [];
  for (const f of buildingLayout(office.floors).floors) {
    const floor = office.floors[f.inputIndex]!;
    for (const l of f.rooms) {
      const room = floor.rooms[l.index]!;
      const plan = furnishingPlan(furnishingInput(room, l));
      if (plan.skipped.length > 0) {
        result.push(`room "${room.name}": not enough space for ${plan.skipped.join(', ')} (props skipped on the scene)`);
      }
      if (plan.agentsWithoutPlace > 0) {
        result.push(`room "${room.name}": not enough space for ${plan.agentsWithoutPlace} agents (not drawn)`);
      }
    }
  }
  return result;
}
