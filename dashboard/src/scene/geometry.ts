// Turns blocks into one BufferGeometry with vertex colors and "baked" shading.
// No lights: top light, left wall (+z) medium, right (+x) dark — classic isometric pixel art, cheap to
// render (MeshBasicMaterial, one geometry per layer).
import { BufferAttribute, BufferGeometry, Color, SRGBColorSpace } from 'three';
import type { Block } from '../voxel';

/** Brightness factor for the faces: +x, -x, +y, -y, +z, -z. */
const SHADES = [0.7, 0.62, 1.0, 0.5, 0.86, 0.66] as const;

// Vertices of the 6 faces of a unit cube (CCW seen from outside).
const FACES: ReadonlyArray<readonly number[]> = [
  [1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1], // +x
  [0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0], // -x
  [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0], // +y
  [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1], // -y
  [0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1], // +z
  [1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0], // -z
];
const NORMALS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
] as const;

const colorCache = new Map<string, Color>();
function color(hex: string): Color {
  let c = colorCache.get(hex);
  if (!c) {
    c = new Color().setStyle(hex, SRGBColorSpace);
    colorCache.set(hex, c);
  }
  return c;
}

/**
 * @param scale size of a block unit in tiles (1 for building parts, 1/8 for voxel models)
 */
export function blockGeometry(
  blocks: readonly Block[],
  scale = 1,
  offset: readonly [number, number, number] = [0, 0, 0],
): BufferGeometry {
  const n = blocks.length * 6 * 4;
  const positions = new Float32Array(n * 3);
  const normals = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const indices = new Uint32Array(blocks.length * 6 * 6);
  const tmp = new Color();
  let v = 0;
  let i = 0;
  const [ox, oy, oz] = offset;
  for (const k of blocks) {
    // Shading in sRGB space (predictable for pixel art), then into the working space.
    const srgb = color(k.c).clone().convertLinearToSRGB();
    for (let s = 0; s < 6; s++) {
      const f = FACES[s]!;
      const nr = NORMALS[s]!;
      tmp.setRGB(srgb.r * SHADES[s]!, srgb.g * SHADES[s]!, srgb.b * SHADES[s]!, SRGBColorSpace);
      for (let w = 0; w < 4; w++) {
        const p = (v + w) * 3;
        positions[p] = ox + (k.x + f[w * 3]! * k.w) * scale;
        positions[p + 1] = oy + (k.y + f[w * 3 + 1]! * k.h) * scale;
        positions[p + 2] = oz + (k.z + f[w * 3 + 2]! * k.d) * scale;
        normals[p] = nr[0];
        normals[p + 1] = nr[1];
        normals[p + 2] = nr[2];
        colors[p] = tmp.r;
        colors[p + 1] = tmp.g;
        colors[p + 2] = tmp.b;
      }
      indices.set([v, v + 1, v + 2, v, v + 2, v + 3], i);
      v += 4;
      i += 6;
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  g.setAttribute('normal', new BufferAttribute(normals, 3));
  g.setAttribute('color', new BufferAttribute(colors, 3));
  g.setIndex(new BufferAttribute(indices, 1));
  g.computeBoundingSphere();
  return g;
}
