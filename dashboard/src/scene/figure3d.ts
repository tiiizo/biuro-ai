// Voxel figure: three poses (sitting, standing, step) as separate geometries switched during the animation.
// The model is centred at (0, 0) horizontally and faces +z; a facing = a ready, rotated geometry.
import { Group, Mesh, type Material } from 'three';
import type { Facing, Look, Pose } from '../figures';
import { darken } from '../palette';
import { Blocks, rotate, VOXELS_PER_TILE } from '../voxel';
import { blockGeometry } from './geometry';

const S = 1 / VOXELS_PER_TILE;

function head(k: Blocks, l: Look, y: number): void {
  k.b(-1.5, y, -1.5, 3, 3, 3, l.skin);
  // Hair: top and back of the head; longer hair falls to the neck.
  k.b(-1.6, y + 2.3, -1.6, 3.2, 1, 3.2, l.hair);
  k.b(-1.6, y + (l.longHair ? 0.2 : 1.2), -1.6, 3.2, l.longHair ? 2.2 : 1.2, 0.9, l.hair);
  // Eyes at the front.
  k.b(-0.9, y + 1.3, 1.5, 0.5, 0.6, 0.1, '#1d1b29').b(0.4, y + 1.3, 1.5, 0.5, 0.6, 0.1, '#1d1b29');
}

function torso(k: Blocks, l: Look, y: number): void {
  k.b(-2, y, -1, 4, 4.5, 2, l.outfit);
  // Collar / the director's tie.
  if (l.role === 'director') k.b(-0.3, y + 1.8, 1, 0.6, 2.6, 0.1, '#e5383b').b(-1, y + 4, 1, 2, 0.5, 0.1, '#f4f1ea');
  else k.b(-1, y + 4, 1, 2, 0.5, 0.1, darken(l.outfit, 0.2));
}

function standing(l: Look, step: 0 | 1 | null): Blocks {
  const k = new Blocks();
  const sw = step === null ? 0 : step === 0 ? 0.8 : -0.8;
  // Legs (in a step one forward, the other back).
  k.b(-1.8, 0, -0.8 + sw, 1.6, 5.5, 1.6, l.trousers).b(0.2, 0, -0.8 - sw, 1.6, 5.5, 1.6, l.trousers);
  k.b(-1.8, 0, -0.6 + sw, 1.6, 0.6, 2, '#2b2b2b').b(0.2, 0, -0.6 - sw, 1.6, 0.6, 2, '#2b2b2b');
  torso(k, l, 5.5);
  // Arms (swing opposite to the legs).
  k.b(-3, 6, -0.7 - sw, 1, 3.8, 1.4, l.outfit).b(2, 6, -0.7 + sw, 1, 3.8, 1.4, l.outfit);
  k.b(-3, 5.3, -0.7 - sw, 1, 0.8, 1.4, l.skin).b(2, 5.3, -0.7 + sw, 1, 0.8, 1.4, l.skin);
  head(k, l, 10);
  return k;
}

function sitting(l: Look): Blocks {
  const k = new Blocks();
  // Thighs forward on the seat (y ≈ 3.5), shins down.
  k.b(-1.8, 3.5, -0.8, 1.6, 1.6, 3.4, l.trousers).b(0.2, 3.5, -0.8, 1.6, 1.6, 3.4, l.trousers);
  k.b(-1.8, 0.4, 1.4, 1.6, 3.2, 1.4, l.trousers).b(0.2, 0.4, 1.4, 1.6, 3.2, 1.4, l.trousers);
  k.b(-1.8, 0, 1.4, 1.6, 0.6, 2, '#2b2b2b').b(0.2, 0, 1.4, 1.6, 0.6, 2, '#2b2b2b');
  torso(k, l, 5);
  // Arms stretched towards the keyboard.
  k.b(-3, 6.2, -0.4, 1, 3, 1.4, l.outfit).b(2, 6.2, -0.4, 1, 3, 1.4, l.outfit);
  k.b(-3, 6.2, 1, 1, 1, 2.2, l.outfit).b(2, 6.2, 1, 1, 1, 2.2, l.outfit);
  k.b(-2.8, 6.4, 3.2, 0.8, 0.7, 0.8, l.skin).b(2, 6.4, 3.2, 0.8, 0.7, 0.8, l.skin);
  head(k, l, 9.5);
  return k;
}

type PoseName = 'sitting' | 'standing' | 'step0' | 'step1';

/**
 * Poses in four directions as separate geometries: the rotation is applied to the blocks before the shading
 * is "baked", so the left/right side of the figure has the right shade in every direction.
 */
export class Figure3D {
  readonly group = new Group();
  private readonly meshes = new Map<string, Mesh>();
  private active: Mesh | undefined;

  constructor(look: Look, material: Material) {
    const poses: Record<PoseName, Blocks> = {
      sitting: sitting(look),
      standing: standing(look, null),
      step0: standing(look, 0),
      step1: standing(look, 1),
    };
    for (const [name, k] of Object.entries(poses)) {
      for (let dir = 0; dir < 4; dir++) {
        // The model is centred at (0, 0): rotation around the origin (base 0 × 0).
        const m = new Mesh(blockGeometry(rotate(k.list, dir, 0, 0), S), material);
        m.visible = false;
        this.meshes.set(`${name}:${dir}`, m);
        this.group.add(m);
      }
    }
    this.set('standing', 0, 0);
  }

  set(pose: Pose, facing: Facing, step: 0 | 1): void {
    const name: PoseName = pose === 'sitting' ? 'sitting' : pose === 'standing' ? 'standing' : step === 0 ? 'step0' : 'step1';
    const m = this.meshes.get(`${name}:${facing}`);
    if (m === this.active) return;
    if (this.active) this.active.visible = false;
    if (m) m.visible = true;
    this.active = m;
  }
}
