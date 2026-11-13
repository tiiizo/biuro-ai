import { describe, expect, it } from 'vitest';
import { WALL_HEIGHT } from '../src/layout';
import { parseOffice } from '../src/parse';
import { buildBuilding } from '../src/scene/building';
import { TO_CAMERA, roomUnderRay, intersect, roomBox, slabBox, type Ray, type Vec3 } from '../src/picking';
import sample from './fixtures/office.md?raw';

/** A camera ray that goes through the scene point `target`. */
function rayAt(target: Vec3): Ray {
  return {
    origin: { x: target.x + TO_CAMERA.x * 200, y: target.y + TO_CAMERA.y * 200, z: target.z + TO_CAMERA.z * 200 },
    direction: { x: -TO_CAMERA.x, y: -TO_CAMERA.y, z: -TO_CAMERA.z },
  };
}

describe('TO_CAMERA', () => {
  it('unit length, 30° above the horizon, azimuth 45° (the one the scene uses)', () => {
    const { x, y, z } = TO_CAMERA;
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 12);
    expect((Math.atan2(y, Math.hypot(x, z)) * 180) / Math.PI).toBeCloseTo(30, 10);
    expect(x).toBeCloseTo(z, 12);
  });
});

describe('intersect', () => {
  const box = { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };

  it('hits a box straight on and gives the distance to the entry', () => {
    expect(intersect({ origin: { x: 0.5, y: 5, z: 0.5 }, direction: { x: 0, y: -1, z: 0 } }, box)).toBeCloseTo(4);
  });

  it('a box behind or beside the ray = no hit', () => {
    expect(intersect({ origin: { x: 0.5, y: 5, z: 0.5 }, direction: { x: 0, y: 1, z: 0 } }, box)).toBeUndefined();
    expect(intersect({ origin: { x: 2, y: 5, z: 0.5 }, direction: { x: 0, y: -1, z: 0 } }, box)).toBeUndefined();
  });

  it('an origin inside the box = distance 0', () => {
    expect(intersect({ origin: { x: 0.5, y: 0.5, z: 0.5 }, direction: { x: 1, y: 0, z: 0 } }, box)).toBe(0);
  });
});

describe('roomUnderRay', () => {
  it('picks the closer of two rooms on the line of sight', () => {
    const far = roomBox({ x: 0, z: 0, w: 2, d: 2 }, 0);
    const near = roomBox({ x: 3, z: 3, w: 2, d: 2 }, 0);
    const r: Ray = { origin: { x: 10, y: 1, z: 10 }, direction: { x: -1, y: 0, z: -1 } };
    expect(roomUnderRay(r, [far, near], [])).toBe(1);
  });

  it("the slab of the floor above hides the room below; the room's own floor does not", () => {
    const room = roomBox({ x: 0, z: 0, w: 4, d: 4 }, 0);
    const ownFloor = slabBox({ x: -1, z: -1, w: 6, d: 6 }, 0);
    const above = slabBox({ x: -1, z: -1, w: 6, d: 6 }, WALL_HEIGHT + 2);
    const fromTop: Ray = { origin: { x: 2, y: 50, z: 2 }, direction: { x: 0, y: -1, z: 0 } };
    expect(roomUnderRay(fromTop, [room], [ownFloor])).toBe(0);
    expect(roomUnderRay(fromTop, [room], [ownFloor, above])).toBeUndefined();
  });

  it('an empty corridor = no room', () => {
    const room = roomBox({ x: 0, z: 0, w: 2, d: 2 }, 0);
    expect(roomUnderRay(rayAt({ x: 5, y: 0, z: 5 }), [room], [])).toBeUndefined();
  });

  it('office.md fixture: the front of every room floor (seen from the camera) hits that room', () => {
    const r = parseOffice(sample);
    if (!r.ok) throw new Error('fixture does not validate');
    const b = buildBuilding(r.office);
    const rooms = b.rooms.map((x) => roomBox(x.layout, x.floor.y));
    const slabs = b.layout.floors.map((f) => slabBox(f.bounds, f.y));
    let hits = 0;
    b.rooms.forEach((x, i) => {
      const l = x.layout;
      // A point near the front edge of the floor: there the camera sees the room below the slab of the floor above.
      const result = roomUnderRay(rayAt({ x: l.x + l.w / 2, y: x.floor.y + 0.05, z: l.z + l.d - 0.3 }), rooms, slabs);
      expect(result === i || result === undefined, `${x.room.name} → ${String(result)}`).toBe(true);
      if (result === i) hits++;
    });
    // The storey height is chosen so that the front of every room is visible (src/layout.ts).
    expect(hits).toBe(b.rooms.length);
  });
});
