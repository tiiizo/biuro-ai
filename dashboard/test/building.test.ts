import { describe, expect, it } from 'vitest';
import { CORE } from '../src/layout';
import { parseOffice } from '../src/parse';
import { shaftDepth, BUILDING_COLORS, buildBuilding } from '../src/scene/building';
import sample from './fixtures/office.md?raw';

function office() {
  const r = parseOffice(sample);
  if (!r.ok) throw new Error('fixture office.md does not validate');
  return r.office;
}

describe('building core: just an elevator, no stairs', () => {
  it('the core is shallower than a staircase would be (d = 3) and fits the shaft with a landing', () => {
    expect(CORE.d).toBeLessThan(3);
    expect(shaftDepth(CORE)).toBeGreaterThan(1.2);
    expect(shaftDepth(CORE)).toBeLessThan(CORE.d);
  });

  it('the building palette has no stair colors', () => {
    expect(Object.keys(BUILDING_COLORS).some((k) => k.startsWith('stair'))).toBe(false);
  });

  it('all blocks within the core footprint fit in the elevator shaft (nothing sticks out onto the landing)', () => {
    const b = buildBuilding(office());
    for (const f of b.layout.floors) {
      const r = f.core;
      const inCore = b.solid.list.filter(
        (k) =>
          k.y >= f.y && k.y < f.y + f.height - 0.5 &&
          k.x >= r.x - 0.01 && k.x + k.w <= r.x + r.w + 0.01 &&
          k.z >= r.z - 0.01 && k.z + k.d <= r.z + r.d + 0.01 &&
          // corridor floor tiles (1×1 plates 0.02 thick) are not part of the core
          k.h > 0.05,
      );
      expect(inCore.length).toBeGreaterThan(0);
      for (const k of inCore) {
        expect(k.z + k.d, `block ${JSON.stringify(k)}`).toBeLessThanOrEqual(r.z + shaftDepth(r) + 0.01);
      }
    }
  });
});
