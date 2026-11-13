// Which room is under the cursor. A pure function without three, tested in test/picking.test.ts.
//
// The scene turns the cursor position into a camera ray (three: Raycaster.setFromCamera), and here the
// ray is intersected with the room boxes (footprint from `SceneRoom.layout` × wall height). Floor slabs
// occlude: if the ray hits a slab before a room, the cursor is above a corridor or a floor higher up, not
// above the room hidden below.
import { SLAB_THICKNESS, WALL_HEIGHT, type Rect } from './layout';

export type Vec3 = { x: number; y: number; z: number };
export type Ray = { origin: Vec3; direction: Vec3 };
export type Box = { min: Vec3; max: Vec3 };

/**
 * Unit direction from the target to the camera (30° above the horizon, azimuth 45°). One source for the
 * scene (scene/scene.ts places the camera) and the picking tests.
 */
export const TO_CAMERA: Readonly<Vec3> = (() => {
  const v = { x: 1, y: Math.SQRT2 * Math.tan(Math.PI / 6), z: 1 };
  const n = Math.hypot(v.x, v.y, v.z);
  return Object.freeze({ x: v.x / n, y: v.y / n, z: v.z / n });
})();

/** Distance (parameter t ≥ 0) to where the ray enters the box, or undefined (slab method). */
export function intersect(r: Ray, b: Box): number | undefined {
  let tMin = 0;
  let tMax = Number.POSITIVE_INFINITY;
  for (const axis of ['x', 'y', 'z'] as const) {
    const o = r.origin[axis];
    const k = r.direction[axis];
    if (Math.abs(k) < 1e-12) {
      if (o < b.min[axis] || o > b.max[axis]) return undefined;
      continue;
    }
    let t1 = (b.min[axis] - o) / k;
    let t2 = (b.max[axis] - o) / k;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return undefined;
  }
  return tMin;
}

/** A room as a box: from the floor to the top of the walls. */
export function roomBox(r: Rect, floorY: number): Box {
  return {
    min: { x: r.x, y: floorY, z: r.z },
    max: { x: r.x + r.w, y: floorY + WALL_HEIGHT, z: r.z + r.d },
  };
}

/** The floor slab (the plate under its floor). */
export function slabBox(bounds: Rect, floorY: number): Box {
  return {
    min: { x: bounds.x, y: floorY - SLAB_THICKNESS, z: bounds.z },
    max: { x: bounds.x + bounds.w, y: floorY, z: bounds.z + bounds.d },
  };
}

/**
 * Index of the closest room hit, or undefined. A slab hides a room only when the ray hits it clearly earlier
 * (the room's own floor lies below it, so a tie goes to the room).
 */
export function roomUnderRay(r: Ray, rooms: readonly Box[], slabs: readonly Box[]): number | undefined {
  let best: number | undefined;
  let tBest = Number.POSITIVE_INFINITY;
  rooms.forEach((b, i) => {
    const t = intersect(r, b);
    if (t !== undefined && t < tBest) {
      tBest = t;
      best = i;
    }
  });
  if (best === undefined) return undefined;
  const EPS = 1e-6;
  for (const s of slabs) {
    const t = intersect(r, s);
    if (t !== undefined && t < tBest - EPS) return undefined;
  }
  return best;
}
