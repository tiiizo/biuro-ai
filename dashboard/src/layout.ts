// Building layout: a pure function (no three), property-tested in test/layout.test.ts.
//
// Unit: 1 tile. X axis to the right, Z to the front (towards the camera), Y up.
// Every floor is a layer of the cross-section. The core (just an elevator shaft, no stairs) stands in the
// same place on every floor: x ∈ [-1, 1], z ∈ [0, 2]. Rooms are laid out around it:
// - row 0 (back): alternately right and left of the core, at most 2 rooms per side;
// - further rows (towards the front): centred on the core axis (centre, right, left, …), at most 5 rooms.
// Headquarters is always at the bottom, and the Director's room stands in the middle of Headquarters:
// first in row 1, exactly on the core axis (in front of the elevator).
import type { Level } from './level';

export type Rect = { x: number; z: number; w: number; d: number };

export type RoomInput = { name: string; level: Level };
export type FloorInput = { name: string; rooms: RoomInput[] };

export type RoomLayout = Rect & {
  name: string;
  /** Size level on the scene (for the Director's room DIRECTOR_LEVEL_BONUS higher than from `open`). */
  level: Level;
  /** The Director's room in the middle of Headquarters. */
  central: boolean;
  /** Index of the room in the floor input (order from office.md). */
  index: number;
};

export type FloorLayout = {
  name: string;
  /** Index in office.md (the order of floors in the building may differ: Headquarters at the bottom). */
  inputIndex: number;
  /** Floor level (top surface of the slab). */
  y: number;
  /** Distance to the floor of the next storey. */
  height: number;
  /** Floor slab: covers the core and all rooms with a margin. */
  bounds: Rect;
  core: Rect;
  rooms: RoomLayout[];
};

export type BuildingLayout = {
  floors: FloorLayout[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; height: number };
};

/**
 * Room width by level 1–10: every level has a different footprint (width × depth), and the area grows
 * strictly with the level (8, 10, 12, 15, 16, 20, 25, 30, 35, 42 tiles). Width 2–7 never decreases,
 * depth 4–6 tells apart levels with the same width. Desk count = width − 1 (src/furnishing.ts), so it
 * also grows with the level. Width and depth stay small so the building does not outgrow the screen.
 */
export const ROOM_WIDTH: Readonly<Record<Level, number>> = {
  1: 2, 2: 2, 3: 3, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 7, 10: 7,
};

/**
 * Room depth in tiles by level (4–6): a row of desks, a row of chairs, the aisle and 1–3 rows of
 * furniture (see src/furnishing.ts).
 */
export const ROOM_DEPTH: Readonly<Record<Level, number>> = {
  1: 4, 2: 5, 3: 4, 4: 5, 5: 4, 6: 5, 7: 5, 8: 5, 9: 5, 10: 6,
};

/** Core = elevator shaft with a landing in front of the doors. */
export const CORE: Readonly<Rect> = { x: -1, z: 0, w: 2, d: 2 };
/** Gap (corridor) between rooms, the core and rows. */
export const GAP = 1;
/** Slab margin around the rooms. */
export const MARGIN = 1;
export const WALL_HEIGHT = 2.5;
export const SLAB_THICKNESS = 0.4;
/**
 * Highlight of the Director's room: its size is this many levels higher than `open` gives (at most 10).
 * Easy to undo: set 0. The second highlight (floor border) is in src/scene/building.ts.
 */
export const DIRECTOR_LEVEL_BONUS = 1;
const MAX_IN_ROW_0_PER_SIDE = 2;
const MAX_IN_ROW = 5;

export function roomSize(level: Level): { w: number; d: number } {
  return { w: ROOM_WIDTH[level], d: ROOM_DEPTH[level] };
}

/** The floor that always stands at the bottom of the building. */
export const HEADQUARTERS = 'Headquarters';

export function isHeadquarters(floorName: string): boolean {
  return floorName.trim().toLowerCase() === HEADQUARTERS.toLowerCase();
}

function isDirector(roomName: string): boolean {
  return /director/i.test(roomName);
}

type Positioned = RoomInput & { index: number; central: boolean; w: number; d: number };

/** Lays out the rooms of one floor around the core; the result has no `y` and `height`. */
export function floorLayout(
  floor: FloorInput,
  headquarters: boolean,
): Pick<FloorLayout, 'name' | 'bounds' | 'core' | 'rooms'> {
  const all: Positioned[] = floor.rooms.map((r, index) => ({
    ...r,
    index,
    central: false,
    ...roomSize(r.level),
  }));

  let central: Positioned | undefined;
  if (headquarters && all.length > 0) {
    central = all.find((r) => isDirector(r.name)) ?? all[0]!;
    central.central = true;
    central.level = Math.min(10, central.level + DIRECTOR_LEVEL_BONUS) as Level;
    Object.assign(central, roomSize(central.level));
  }
  const others = all.filter((r) => r !== central);

  // Row 0: next to the core, alternately right/left.
  const row0 = others.slice(0, 2 * MAX_IN_ROW_0_PER_SIDE);
  const rest = others.slice(row0.length);
  const frontRows: Positioned[][] = [];
  const queue = central ? [central, ...rest] : rest;
  for (let i = 0; i < queue.length; i += MAX_IN_ROW) frontRows.push(queue.slice(i, i + MAX_IN_ROW));

  const result: RoomLayout[] = [];
  const add = (r: Positioned, x: number, z: number) =>
    result.push({ name: r.name, level: r.level, central: r.central, index: r.index, x, z, w: r.w, d: r.d });

  let right = CORE.x + CORE.w + GAP;
  let left = CORE.x - GAP;
  row0.forEach((r, i) => {
    if (i % 2 === 0) {
      add(r, right, 0);
      right += r.w + GAP;
    } else {
      left -= r.w;
      add(r, left, 0);
      left -= GAP;
    }
  });

  let z = Math.max(CORE.d, ...row0.map((r) => r.d)) + GAP;
  for (const row of frontRows) {
    const [middle, ...sides] = row;
    if (!middle) continue;
    // The middle of the row is centred on the core axis (x = 0).
    const xm = -Math.floor(middle.w / 2);
    add(middle, xm, z);
    let r = xm + middle.w + GAP;
    let l = xm - GAP;
    sides.forEach((room, i) => {
      if (i % 2 === 0) {
        add(room, r, z);
        r += room.w + GAP;
      } else {
        l -= room.w;
        add(room, l, z);
        l -= GAP;
      }
    });
    z += Math.max(...row.map((x) => x.d)) + GAP;
  }

  const rects: Rect[] = [CORE, ...result];
  const minX = Math.min(...rects.map((r) => r.x)) - MARGIN;
  const maxX = Math.max(...rects.map((r) => r.x + r.w)) + MARGIN;
  const minZ = Math.min(...rects.map((r) => r.z)) - MARGIN;
  const maxZ = Math.max(...rects.map((r) => r.z + r.d)) + MARGIN;

  result.sort((a, b) => a.index - b.index);
  return {
    name: floor.name,
    bounds: { x: minX, z: minZ, w: maxX - minX, d: maxZ - minZ },
    core: { ...CORE },
    rooms: result,
  };
}

/** Camera tangent (30° above the horizon, azimuth 45°): shift of the ray along Z per unit of height. */
const SHIFT_PER_HEIGHT = 1 / (Math.tan(Math.PI / 6) * Math.SQRT2);

/** Height of furnishings that must stay visible below the slab of the floor above (heads, monitors, boards). */
const INTERIOR_HEIGHT = 1.5;

/**
 * Storey height: walls + slab, but also enough that the slab of the floor above does not hide the
 * interiors of the floor below in the isometric view. The camera looks from the front (+z) 30° above the
 * horizon, so a point at height v is visible below the slab (underside at h − slab) if
 * z + 1.22·(h − slab − v) ≥ front of the slab. Computed for furnishings up to 1.5 tiles high, further than
 * 1.5 tiles from the back wall (z = 0).
 */
export function storeyHeight(frontOfFloorAbove: number | undefined): number {
  const minimum = WALL_HEIGHT + SLAB_THICKNESS + 1.1;
  if (frontOfFloorAbove === undefined) return minimum;
  const needed = Math.max(0, frontOfFloorAbove - 1.5) / SHIFT_PER_HEIGHT + INTERIOR_HEIGHT + SLAB_THICKNESS;
  return Math.max(minimum, Math.ceil(needed * 2) / 2);
}

/** Floor order from the bottom: Headquarters first, the rest in file order. */
export function floorOrder<T extends { name: string }>(floors: readonly T[]): Array<{ floor: T; index: number }> {
  const z = floors.map((floor, index) => ({ floor, index }));
  const hq = z.filter((f) => isHeadquarters(f.floor.name));
  return [...hq, ...z.filter((f) => !isHeadquarters(f.floor.name))];
}

export function buildingLayout(floors: readonly FloorInput[]): BuildingLayout {
  const result: FloorLayout[] = [];
  const layouts = floorOrder(floors).map(({ floor, index }) => ({
    index,
    l: floorLayout(floor, isHeadquarters(floor.name)),
  }));
  let y = 0;
  layouts.forEach(({ l, index }, i) => {
    const above = layouts[i + 1]?.l.bounds;
    const height = storeyHeight(above ? above.z + above.d : undefined);
    result.push({ ...l, inputIndex: index, y, height });
    y += height;
  });
  const b = result.map((f) => f.bounds);
  return {
    floors: result,
    bounds: {
      minX: Math.min(0, ...b.map((r) => r.x)),
      maxX: Math.max(0, ...b.map((r) => r.x + r.w)),
      minZ: Math.min(0, ...b.map((r) => r.z)),
      maxZ: Math.max(0, ...b.map((r) => r.z + r.d)),
      height: y,
    },
  };
}

/** Whether two rectangles overlap (a shared edge is not a collision). */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.z < b.z + b.d && b.z < a.z + a.d;
}
