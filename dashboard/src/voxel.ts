// Blocks (cuboids) — the shared format of voxel models. Plain TS, no three.
//
// A model is a list of blocks in voxel units (1 tile = VOXELS_PER_TILE voxels) in a local frame:
// x to the right, y up, z to the front (towards the camera), origin in the back-left-bottom corner of the
// base. A color is '#rrggbb'. Face shading (top light, left medium, right dark) is added only by the
// geometry (scene/geometry.ts), so models describe just shape and color.

export const VOXELS_PER_TILE = 8;

export type Block = { x: number; y: number; z: number; w: number; h: number; d: number; c: string };

/** Helper for building models: offset and rotation by a multiple of 90° around the Y axis. */
export class Blocks {
  readonly list: Block[] = [];

  /** Adds a block (w, h, d > 0). */
  b(x: number, y: number, z: number, w: number, h: number, d: number, c: string): this {
    if (w > 0 && h > 0 && d > 0) this.list.push({ x, y, z, w, h, d, c });
    return this;
  }

  /** Appends another model with an offset. */
  add(other: readonly Block[], dx = 0, dy = 0, dz = 0): this {
    for (const k of other) this.list.push({ ...k, x: k.x + dx, y: k.y + dy, z: k.z + dz });
    return this;
  }
}

/**
 * Rotates a model by `quarters` × 90° (counter-clockwise seen from above) within a base of
 * width × depth (voxels). The result still starts at (0, 0). Rotation by 1: the front (+z) faces +x.
 */
export function rotate(blocks: readonly Block[], quarters: number, width: number, depth: number): Block[] {
  const n = ((quarters % 4) + 4) % 4;
  return blocks.map((k) => {
    switch (n) {
      case 1:
        // (x, z) → (z, width - x - w)
        return { ...k, x: k.z, z: width - k.x - k.w, w: k.d, d: k.w };
      case 2:
        return { ...k, x: width - k.x - k.w, z: depth - k.z - k.d };
      case 3:
        return { ...k, x: depth - k.z - k.d, z: k.x, w: k.d, d: k.w };
      default:
        return { ...k };
    }
  });
}

/** The cuboid that contains all blocks. */
export function bounds(blocks: readonly Block[]): { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number } {
  if (blocks.length === 0) return { minX: 0, minY: 0, minZ: 0, maxX: 0, maxY: 0, maxZ: 0 };
  return {
    minX: Math.min(...blocks.map((k) => k.x)),
    minY: Math.min(...blocks.map((k) => k.y)),
    minZ: Math.min(...blocks.map((k) => k.z)),
    maxX: Math.max(...blocks.map((k) => k.x + k.w)),
    maxY: Math.max(...blocks.map((k) => k.y + k.h)),
    maxZ: Math.max(...blocks.map((k) => k.z + k.d)),
  };
}
