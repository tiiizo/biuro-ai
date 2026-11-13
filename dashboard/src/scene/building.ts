// Building shell: slabs, core (elevator shaft), rooms (floor, two back walls, windows), roof and grounds.
// Everything in tiles (scale 1). Room furnishings are added by scene/interior.ts.
import type { Office, Room } from '../schema';
import {
  SLAB_THICKNESS,
  WALL_HEIGHT,
  buildingLayout,
  type BuildingLayout,
  type FloorLayout,
  type RoomLayout,
} from '../layout';
import { mix, roomPalette, darken, lighten, hash, type Palette } from '../palette';
import { Blocks } from '../voxel';
import { leftWallWindows } from '../furnishing';

export const WALL_THICKNESS = 0.2;

export const BUILDING_COLORS = {
  sky: '#bfe6f2',
  slabTop: '#efe9dd',
  slabSide: '#f7f3ea',
  slabEdge: '#3b3a4a',
  corridor: '#e3dccd',
  corridorB: '#d9d1c0',
  grass: '#9ccc65',
  grassB: '#8bbd57',
  pavement: '#d8d2c4',
  coreFrame: '#41506b',
  coreWall: '#5c6f91',
  coreDoor: '#cfd8e6',
  glass: '#a8e0f0',
  trunks: '#7a5236',
  crowns: ['#6fb04a', '#86c45a', '#5a9a3c'] as const,
};

export type SceneRoom = {
  room: Room;
  layout: RoomLayout;
  floor: FloorLayout;
  palette: Palette;
};

export type BuildingMesh = {
  layout: BuildingLayout;
  /** Opaque blocks in tiles. */
  solid: Blocks;
  /** Panes (semi-transparent). */
  glass: Blocks;
  rooms: SceneRoom[];
};

function grounds(k: Blocks, l: BuildingLayout): void {
  const g = l.bounds;
  const m = 4;
  const x0 = Math.floor(g.minX) - m;
  const z0 = Math.floor(g.minZ) - m;
  const x1 = Math.ceil(g.maxX) + m;
  const z1 = Math.ceil(g.maxZ) + m;
  const y = -SLAB_THICKNESS;
  // A 2×2 checkered lawn and a pavement around the building.
  for (let x = x0; x < x1; x += 2) {
    for (let z = z0; z < z1; z += 2) {
      const c = ((x - x0) / 2 + (z - z0) / 2) % 2 === 0 ? BUILDING_COLORS.grass : BUILDING_COLORS.grassB;
      k.b(x, y - 0.6, z, Math.min(2, x1 - x), 0.6, Math.min(2, z1 - z), c);
    }
  }
  const f = l.floors[0];
  if (f) {
    const b = f.bounds;
    k.b(b.x - 1, y, b.z - 1, b.w + 2, 0.08, b.d + 2, BUILDING_COLORS.pavement);
  }
  // A few trees (deterministic, diagonally at the front and the sides).
  const trees: Array<[number, number]> = [
    [x0 + 1.5, z1 - 2.5],
    [x1 - 2.5, z1 - 1.5],
    [x1 - 1.5, z0 + 2.5],
    [x0 + 1, z0 + 1],
    [x1 - 3.5, z1 - 3.8],
  ];
  trees.forEach(([x, z], i) => {
    const crown = BUILDING_COLORS.crowns[i % 3]!;
    k.b(x + 0.4, y, z + 0.4, 0.25, 0.9, 0.25, BUILDING_COLORS.trunks);
    k.b(x, y + 0.8, z, 1.05, 0.8, 1.05, crown);
    k.b(x + 0.15, y + 1.6, z + 0.15, 0.75, 0.45, 0.75, lighten(crown, 0.15));
  });
}

function slab(k: Blocks, f: FloorLayout): void {
  const b = f.bounds;
  const y = f.y - SLAB_THICKNESS;
  k.b(b.x, y, b.z, b.w, SLAB_THICKNESS, b.d, BUILDING_COLORS.slabSide);
  // Dark edge under the slab (an outline like in a cross-section illustration).
  k.b(b.x, y - 0.06, b.z, b.w, 0.06, b.d, BUILDING_COLORS.slabEdge);
  // Corridor floor in large tiles.
  for (let x = b.x; x < b.x + b.w; x += 1) {
    for (let z = b.z; z < b.z + b.d; z += 1) {
      const c = (x + z) % 2 === 0 ? BUILDING_COLORS.corridor : BUILDING_COLORS.corridorB;
      k.b(x, f.y, z, 1, 0.02, 1, c);
    }
  }
}

/** Depth of the elevator shaft; a narrow landing stays in front of the doors (the rest of the core depth). */
export function shaftDepth(r: { d: number }): number {
  return r.d - 0.3;
}

/** Core: just an elevator shaft (no stairs) for the storey height, doors at the front. */
function core(k: Blocks, s: Blocks, f: FloorLayout, cabin: boolean): void {
  const r = f.core;
  const y = f.y;
  const h = f.height - SLAB_THICKNESS;
  const sd = shaftDepth(r);
  const c = BUILDING_COLORS;
  // Back wall of the shaft and corner posts.
  k.b(r.x, y, r.z, r.w, h, 0.15, c.coreWall);
  for (const [px, pz] of [[r.x, r.z], [r.x + r.w - 0.12, r.z], [r.x, r.z + sd - 0.12], [r.x + r.w - 0.12, r.z + sd - 0.12]] as const) {
    k.b(px, y, pz, 0.12, h, 0.12, c.coreFrame);
  }
  // Beams every storey and the elevator doors at the front.
  k.b(r.x, y + h - 0.12, r.z, r.w, 0.12, sd, c.coreFrame);
  k.b(r.x + 0.55, y, r.z + sd - 0.1, 0.9, 1.5, 0.08, c.coreDoor);
  k.b(r.x + 0.99, y, r.z + sd - 0.11, 0.02, 1.5, 0.09, c.coreFrame);
  k.b(r.x + 0.5, y + 1.5, r.z + sd - 0.1, 1.0, 0.1, 0.09, c.coreFrame);
  // Button panel next to the doors and the floor light above them.
  k.b(r.x + 1.6, y + 0.8, r.z + sd - 0.06, 0.12, 0.25, 0.06, c.coreFrame);
  k.b(r.x + 1.63, y + 0.88, r.z + sd - 0.03, 0.06, 0.06, 0.04, '#ffd166');
  k.b(r.x + 0.92, y + 1.68, r.z + sd - 0.06, 0.16, 0.12, 0.06, '#ffd166');
  // Side panes of the shaft.
  s.b(r.x + 0.02, y, r.z + 0.15, 0.06, h - 0.12, sd - 0.27, c.glass);
  s.b(r.x + r.w - 0.08, y, r.z + 0.15, 0.06, h - 0.12, sd - 0.27, c.glass);
  if (cabin) {
    k.b(r.x + 0.3, y + 0.05, r.z + 0.25, r.w - 0.6, 1.6, sd - 0.5, '#e9c46a');
    k.b(r.x + 0.3, y + 1.65, r.z + 0.25, r.w - 0.6, 0.08, sd - 0.5, darken('#e9c46a', 0.3));
  }
}

/** Room: checkered floor, back wall (−z) and left wall (−x), trims, windows. */
function roomShell(k: Blocks, s: Blocks, l: RoomLayout, f: FloorLayout, pal: Palette): void {
  const y = f.y;
  const t = WALL_THICKNESS;
  const h = WALL_HEIGHT;
  for (let i = 0; i < l.w; i++) {
    for (let j = 0; j < l.d; j++) {
      k.b(l.x + i, y, l.z + j, 1, 0.05, 1, (i + j) % 2 === 0 ? pal.floor : pal.floorB);
    }
  }
  // Highlight of the Director's room: a floor border in the accent color with a golden inner stripe.
  // Easy to undo: remove this block (the size highlight is DIRECTOR_LEVEL_BONUS in src/layout.ts).
  if (l.central) {
    const r = 0.14;
    const gold = '#f2c14e';
    k.b(l.x, y + 0.05, l.z, l.w, 0.02, r, pal.accent);
    k.b(l.x, y + 0.05, l.z + l.d - r, l.w, 0.02, r, pal.accent);
    k.b(l.x, y + 0.05, l.z + r, r, 0.02, l.d - 2 * r, pal.accent);
    k.b(l.x + l.w - r, y + 0.05, l.z + r, r, 0.02, l.d - 2 * r, pal.accent);
    k.b(l.x + r, y + 0.05, l.z + r, l.w - 2 * r, 0.02, 0.05, gold);
    k.b(l.x + r, y + 0.05, l.z + l.d - r - 0.05, l.w - 2 * r, 0.02, 0.05, gold);
    k.b(l.x + r, y + 0.05, l.z + r, 0.05, 0.02, l.d - 2 * r, gold);
    k.b(l.x + l.w - r - 0.05, y + 0.05, l.z + r, 0.05, 0.02, l.d - 2 * r, gold);
  }
  // Room threshold (floor outline on the corridor side).
  k.b(l.x, y, l.z + l.d - 0.04, l.w, 0.07, 0.04, pal.trim);
  k.b(l.x + l.w - 0.04, y, l.z, 0.04, 0.07, l.d, pal.trim);

  // Walls: the back wall covers the corner.
  k.b(l.x - t, y, l.z - t, l.w + t, h, t, pal.wall);
  k.b(l.x - t, y, l.z, t, h, l.d, pal.wallB);
  // Skirting board and cornice.
  k.b(l.x, y + 0.05, l.z, l.w, 0.12, 0.03, pal.trim);
  k.b(l.x, y + 0.05, l.z, 0.03, 0.12, l.d, pal.trim);
  k.b(l.x - t, y + h, l.z - t, l.w + t, 0.1, t + 0.02, pal.trim);
  k.b(l.x - t, y + h, l.z, t + 0.02, 0.1, l.d, pal.trim);
  // Accent stripe at the top of the walls (project theme).
  k.b(l.x, y + h - 0.32, l.z - 0.005, l.w, 0.14, 0.03, pal.accent);
  k.b(l.x - 0.005, y + h - 0.32, l.z, 0.03, 0.14, l.d, pal.accent);

  // Windows on the left (outer) wall, 1 tile wide; the back wall stays free for boards and posters.
  const frame = lighten(pal.trim, 0.1);
  for (const j of leftWallWindows(l.d)) {
    const z = l.z + j + 0.08;
    const len = 0.84;
    const xr = l.x - t - 0.02;
    k.b(xr, y + 0.95, z, t + 0.06, 0.07, len, frame);
    k.b(xr, y + 2.12, z, t + 0.06, 0.07, len, frame);
    k.b(xr, y + 0.95, z, t + 0.06, 1.24, 0.07, frame);
    k.b(xr, y + 0.95, z + len - 0.07, t + 0.06, 1.24, 0.07, frame);
    k.b(xr, y + 1.55, z, t + 0.06, 0.06, len, frame);
    s.b(l.x - t + 0.04, y + 1.0, z + 0.07, 0.04, 1.12, len - 0.14, BUILDING_COLORS.glass);
    k.b(l.x, y + 0.93, z - 0.04, 0.12, 0.05, len + 0.08, mix(pal.wall, '#ffffff', 0.5));
  }
}

/** The cross-section is open at the top; the elevator machine room with an antenna stands above the core. */
function machineRoom(k: Blocks, f: FloorLayout): void {
  const y = f.y + f.height - SLAB_THICKNESS;
  const r = f.core;
  const sd = shaftDepth(r);
  const c = BUILDING_COLORS;
  k.b(r.x - 0.05, y, r.z - 0.05, r.w + 0.1, SLAB_THICKNESS, sd + 0.1, c.slabSide);
  k.b(r.x, y + SLAB_THICKNESS, r.z, r.w, 0.9, sd, c.coreWall);
  k.b(r.x - 0.05, y + SLAB_THICKNESS + 0.9, r.z - 0.05, r.w + 0.1, 0.12, sd + 0.1, c.coreFrame);
  k.b(r.x + 0.3, y + SLAB_THICKNESS + 0.3, r.z + sd, 0.5, 0.35, 0.03, '#98c1d9');
  k.b(r.x + 1.6, y + 1.4, r.z + 0.4, 0.06, 1.2, 0.06, c.coreFrame);
  k.b(r.x + 1.52, y + 2.55, r.z + 0.32, 0.22, 0.22, 0.22, '#ef476f');
}

export function buildBuilding(office: Office): BuildingMesh {
  const layout = buildingLayout(office.floors);
  const solid = new Blocks();
  const glass = new Blocks();
  const rooms: SceneRoom[] = [];
  grounds(solid, layout);
  layout.floors.forEach((f, i) => {
    slab(solid, f);
    // The elevator cabin "travels" between floors — a fixed, deterministic position from the file contents.
    const cabinAt = layout.floors.length > 0 ? hash(office.updated.date) % layout.floors.length : 0;
    core(solid, glass, f, i === cabinAt);
    if (i === layout.floors.length - 1) machineRoom(solid, f);
    const input = office.floors[f.inputIndex]!;
    for (const l of f.rooms) {
      const room = input.rooms[l.index]!;
      const palette = roomPalette(room.colors);
      roomShell(solid, glass, l, f, palette);
      rooms.push({ room, layout: l, floor: f, palette });
    }
  });
  return { layout, solid, glass, rooms };
}
