// Room interiors: furniture, props, wall decorations, animated figures and alarm lamps.
// The static models of all rooms go into one geometry (one draw call).
import { Color, Group, Mesh, MeshBasicMaterial, SRGBColorSpace, type Object3D } from 'three';
import { roomAlarm, alarmPosition } from '../alarm';
import { motionPlan, figureState, figureLook, type MotionPlan } from '../figures';
import { chair, propModel, DESK_TOP, type Model } from '../models';
import { desk, bigDesk } from '../models/furniture';
import { darken } from '../palette';
import { Blocks, rotate, VOXELS_PER_TILE, type Block } from '../voxel';
import { furnishingPlan, furnishingInput, type FurnishingPlan } from '../furnishing';
import type { SceneRoom, BuildingMesh } from './building';
import { blockGeometry } from './geometry';
import { Figure3D } from './figure3d';
import type { Animated, SceneOptions } from './scene';

const V = VOXELS_PER_TILE;
/** Thickness of the room floor (tiles) — models stand on it. */
const FLOOR = 0.05;

function placeModel(
  target: Blocks,
  model: Model,
  room: SceneRoom,
  variant: number,
  x: number,
  y: number,
  z: number,
  rotation = 0,
): void {
  let k: Block[] = model.build(room.palette, variant);
  if (rotation) k = rotate(k, rotation, model.width * V, model.depth * V);
  target.add(k, x, y, z);
}

function furnishRoom(k: Blocks, sr: SceneRoom, plan: FurnishingPlan): void {
  const l = sr.layout;
  const ox = l.x * V;
  const oz = l.z * V;
  const oy = (sr.floor.y + FLOOR) * V;

  for (const s of plan.workstations) {
    const bx = ox + s.desk.i * V;
    const bz = oz + s.desk.j * V;
    if (s.big) {
      placeModel(k, bigDesk, sr, 0, bx, oy, bz);
      placeModel(k, chair(darken(sr.palette.dark, 0.1)), sr, 0, ox + (s.chair.x - 0.5) * V, oy, oz + (s.chair.z - 0.5) * V);
      continue;
    }
    placeModel(k, desk, sr, s.desk.i, bx, oy, bz);
    if (s.equipment) placeModel(k, propModel(s.equipment).model, sr, 0, bx, oy + DESK_TOP, bz);
    if (s.gadget) placeModel(k, propModel(s.gadget).model, sr, 0, bx + 0.6, oy + DESK_TOP, bz + 4.6);
    placeModel(k, chair(sr.palette.accent), sr, 0, ox + (s.chair.x - 0.5) * V, oy, oz + (s.chair.z - 0.5) * V);
  }
  for (const m of [...plan.rugs, ...plan.furniture]) {
    placeModel(k, propModel(m.name).model, sr, m.variant, ox + m.i * V, oy, oz + m.j * V, m.rotation);
  }
  for (const s of plan.walls) {
    const { model } = propModel(s.name);
    if (s.wall === 'back') placeModel(k, model, sr, s.variant, ox + s.position * V, oy, oz);
    // Left wall: the model front rotated towards +x.
    else placeModel(k, model, sr, s.variant, ox, oy, oz + s.position * V, 1);
  }
}

type Lamp = { dome: MeshBasicMaterial; bubble: Object3D; y0: number; phase: number };

/**
 * Alarm lamp: a beacon on a post in the front-left corner of the room and a "!" bubble above it, both inside
 * the room footprint (alarmPosition, tested in test/alarm.test.ts).
 */
function alarmLamp(sr: SceneRoom, material: MeshBasicMaterial, dome: MeshBasicMaterial, group: Group): Lamp {
  const l = sr.layout;
  const y = sr.floor.y + FLOOR;
  const post = new Blocks()
    .b(0, 0, 0, 2.4, 0.6, 2.4, '#2c2e47')
    .b(0.8, 0.6, 0.8, 0.8, 13, 0.8, '#3e4260')
    .b(0.2, 13.6, 0.2, 2, 0.6, 2, '#2c2e47').list;
  const beacon = new Blocks().b(0.3, 14.2, 0.3, 1.8, 1.8, 1.8, '#ff2d2d').b(0.7, 16, 0.7, 1, 0.5, 1, '#ff8a8a').list;
  const spot = alarmPosition(l);
  const position: [number, number, number] = [spot.lamp.x, y, spot.lamp.z];
  group.add(new Mesh(blockGeometry(post, 1 / V, position), material));
  group.add(new Mesh(blockGeometry(beacon, 1 / V, position), dome));

  // The "!" bubble.
  const d = new Blocks();
  d.b(0, 2, 0, 8, 8, 2, '#ffffff');
  d.b(1, 1, 0, 6, 10, 2, '#ffffff');
  d.b(-1, 3, 0, 10, 6, 2, '#ffffff');
  d.b(2, 0, 0.5, 2, 1.5, 1, '#ffffff').b(1.5, -1, 0.5, 1.5, 1.2, 1, '#ffffff');
  d.b(3.2, 4.5, 2, 1.6, 4.5, 0.3, '#e5383b').b(3.2, 2.2, 2, 1.6, 1.5, 0.3, '#e5383b');
  // Bubble outline (dark, at the back).
  d.b(-1.4, 2.6, -0.3, 10.8, 6.8, 0.3, '#1d1b29').b(0.6, 0.6, -0.3, 6.8, 10.8, 0.3, '#1d1b29');
  const bubble = new Mesh(blockGeometry(d.list, 1 / V), material);
  // Above the beacon, in the front-left corner of the room (inside the footprint).
  const y0 = y + 2.25;
  bubble.position.set(spot.bubble.x, y0, spot.bubble.z);
  group.add(bubble);
  return { dome, bubble, y0, phase: (l.x * 7 + l.z * 3) % 5 };
}

export function interior(building: BuildingMesh, options: SceneOptions): { objects: Object3D[]; animated: Animated[] } {
  const statics = new Blocks();
  const material = new MeshBasicMaterial({ vertexColors: true });
  const figureGroup = new Group();
  const alarmGroup = new Group();
  const figures: Array<{ f: Figure3D; plan: MotionPlan | undefined; x: number; z: number; y: number }> = [];
  const lamps: Lamp[] = [];

  for (const sr of building.rooms) {
    // Skipped props and agents without a place go to the header warning list (furnishingWarnings).
    const plan = furnishingPlan(furnishingInput(sr.room, sr.layout));
    furnishRoom(statics, sr, plan);

    // Figures: first the director at the big desk, then the other agents at desks; the rest stand at the
    // spots from the plan (front zone, outside the aisle, the walk target and the line of sight to the director).
    const l = sr.layout;
    const y = sr.floor.y + FLOOR;
    const agents = [...sr.room.agents].sort((a, b) => Number(b === 'director') - Number(a === 'director'));
    const workstations = [...plan.workstations].sort((a, b) => Number(b.big) - Number(a.big));
    agents.forEach((agent, i) => {
      const ws = workstations[i];
      const spot = ws ? undefined : plan.standing[i - workstations.length];
      if (!ws && !spot) return;
      const f = new Figure3D(figureLook(agent), material);
      figureGroup.add(f.group);
      if (ws) {
        const seat = { x: ws.chair.x, z: ws.chair.z - 0.15 };
        const motion = motionPlan(agent, seat, plan.aisle + 0.5, plan.target, plan.targetFacing);
        figures.push({ f, plan: motion, x: l.x, z: l.z, y });
      } else {
        // Without a desk: stands facing the desks (a meeting).
        f.set('standing', 2, 0);
        f.group.position.set(l.x + spot!.x, y, l.z + spot!.z);
        figures.push({ f, plan: undefined, x: l.x, z: l.z, y });
      }
    });

    if (roomAlarm(sr.room.tasks, options.today).alarm) {
      const dome = new MeshBasicMaterial({ vertexColors: true, color: new Color(1, 1, 1) });
      lamps.push(alarmLamp(sr, material, dome, alarmGroup));
    }
  }

  const furniture = new Mesh(blockGeometry(statics.list, 1 / V), material);
  const bright = new Color(1, 1, 1);
  const dim = new Color().setRGB(0.35, 0.3, 0.3, SRGBColorSpace);

  const animated: Animated[] = [
    {
      update(t: number) {
        for (const { f, plan, x, z, y } of figures) {
          if (!plan) continue;
          const s = figureState(plan, t);
          f.set(s.pose, s.facing, s.step);
          f.group.position.set(x + s.x, y + (s.pose === 'walking' && s.step === 1 ? 0.04 : 0), z + s.z);
        }
        for (const lp of lamps) {
          const on = !options.animation || Math.floor(t * 2 + lp.phase) % 2 === 0;
          lp.dome.color.copy(on ? bright : dim);
          lp.bubble.position.y = lp.y0 + (options.animation ? Math.round(Math.sin(t * 2.5 + lp.phase) * 1.5) / V : 0);
        }
      },
    },
  ];
  return { objects: [furniture, figureGroup, alarmGroup], animated };
}
