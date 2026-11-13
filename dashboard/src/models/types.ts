import type { Palette } from '../palette';
import type { Block } from '../voxel';

/**
 * Where a model stands:
 * - `floor` — takes floor tiles (width × depth),
 * - `wall` — hangs on a wall (width in tiles along the wall, 1–2 voxels deep, y in voxels from the floor),
 * - `desk` — stands on a desk top (small base, y from the top),
 * - `equipment` — workstation equipment (monitor, laptop) placed on every desk in the room,
 * - `rug` — flat, takes no tile (figures can walk on it).
 */
export type Spot = 'floor' | 'wall' | 'desk' | 'equipment' | 'rug';

export type Model = {
  spot: Spot;
  /** Base width in tiles (along the X axis or along the wall). */
  width: number;
  /** Base depth in tiles (for a wall: 1, the model is 1–2 voxels thick anyway). */
  depth: number;
  /** Blocks in voxels (1 tile = 8 voxels), the front of the model faces +z. */
  build(p: Palette, variant: number): Block[];
};

/** Shared material colors (outside the room palette). */
export const M = {
  wood: '#b98552',
  woodD: '#8a5a3b',
  woodL: '#d9a96c',
  metal: '#9aa5b8',
  metalD: '#5c677d',
  black: '#26232f',
  white: '#f4f1ea',
  display: '#7fdcf5',
  screenD: '#3a9bc4',
  pot: '#c0694a',
  leaves: '#4f9d4a',
  leavesL: '#7cc35b',
  leavesD: '#2f6e3a',
  cardboard: '#c99a62',
  cardboardD: '#a87a45',
  gold: '#f2c14e',
  goldD: '#c9962a',
  paper: '#fbf6e9',
  red: '#e5383b',
  green: '#43aa8b',
  blue: '#3b82f6',
  yellow: '#ffcf56',
  pink: '#ff8fab',
  purple: '#8e7dbe',
  water: '#5ec8e5',
} as const;
