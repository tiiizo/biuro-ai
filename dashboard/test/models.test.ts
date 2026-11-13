import { describe, expect, it, vi } from 'vitest';
import { FALLBACK_MODEL, EXTRA_MODELS, PROP_MODELS, propModel } from '../src/models';
import { PROPS } from '../src/props';
import { roomPalette } from '../src/palette';
import { parseOffice } from '../src/parse';
import { bounds, rotate, VOXELS_PER_TILE, type Block } from '../src/voxel';
import sample from './fixtures/office.md?raw';
import readme from '../README.md?raw';
import officeManager from '../../.claude/agents/office-manager.md?raw';

const palettes = [roomPalette([]), roomPalette(['#101010', '#e5383b', '#fafaf0']), roomPalette(['#0a3a7a', '#f2a541'])];

describe('model library', () => {
  it('every prop from src/props.ts has its own model (not the fallback)', () => {
    for (const name of PROPS) {
      const { model, known } = propModel(name, () => {
        throw new Error(`warning for a known prop ${name}`);
      });
      expect(known, name).toBe(true);
      expect(model, name).not.toBe(FALLBACK_MODEL);
      expect(PROP_MODELS[name]).toBe(model);
    }
    expect(Object.keys(PROP_MODELS).sort()).toEqual([...PROPS].sort());
  });

  it('props used in office.md, the README and the agent instructions have models', () => {
    const sources = [
      sample,
      /```markdown\n([\s\S]*?)```/.exec(readme)?.[1] ?? '',
      /```markdown\n([\s\S]*?)```/.exec(officeManager)?.[1] ?? '',
    ];
    for (const text of sources) {
      const r = parseOffice(text);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      // An "unknown prop" warning from the parser would be an error in the source too.
      expect(r.warnings.filter((o) => o.reason.includes('prop'))).toEqual([]);
      for (const room of r.office.floors.flatMap((f) => f.rooms)) {
        for (const p of room.props) expect(propModel(p).known, p).toBe(true);
      }
    }
  });

  it('unknown name → fallback model and one warning, no exception', () => {
    const warn = vi.fn();
    const a = propModel('flying-carpet', warn);
    const b = propModel('flying-carpet', warn);
    expect(a.known).toBe(false);
    expect(a.model).toBe(FALLBACK_MODEL);
    expect(b.model).toBe(FALLBACK_MODEL);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('flying-carpet');
    expect(FALLBACK_MODEL.build(palettes[0]!, 0).length).toBeGreaterThan(0);
  });

  const all = Object.entries({ ...PROP_MODELS, ...EXTRA_MODELS, fallback: FALLBACK_MODEL });

  it.each(all)('%s: not empty, valid blocks, fits in its base', (_name, model) => {
    for (const p of palettes) {
      for (let variant = 0; variant < 4; variant++) {
        const k = model.build(p, variant);
        expect(k.length).toBeGreaterThan(0);
        for (const b of k) {
          expect(b.w > 0 && b.h > 0 && b.d > 0).toBe(true);
          expect(b.c).toMatch(/^#[0-9a-f]{6}$/i);
          expect([b.x, b.y, b.z, b.w, b.h, b.d].every(Number.isFinite)).toBe(true);
        }
        const o = bounds(k);
        const slack = 0.5; // small parts may stick out a little (e.g. cactus, mug)
        if (model.spot === 'floor' || model.spot === 'rug' || model.spot === 'equipment') {
          expect(o.minX).toBeGreaterThanOrEqual(-slack);
          expect(o.minZ).toBeGreaterThanOrEqual(-slack);
          expect(o.maxX).toBeLessThanOrEqual(model.width * VOXELS_PER_TILE + slack);
          expect(o.maxZ).toBeLessThanOrEqual(model.depth * VOXELS_PER_TILE + slack);
          expect(o.minY).toBeGreaterThanOrEqual(0);
        }
        if (model.spot === 'wall') {
          // Hangs on the wall: flat (≤ 2.5 voxels from the wall), below the ceiling (20 voxels).
          expect(o.minZ).toBeGreaterThanOrEqual(0);
          expect(o.maxZ).toBeLessThanOrEqual(2.5);
          expect(o.maxY).toBeLessThanOrEqual(20);
        }
        if (model.spot === 'floor') expect(o.maxY).toBeLessThanOrEqual(20);
      }
    }
  });
});

describe('rotate', () => {
  const k: Block[] = [{ x: 1, y: 0, z: 6, w: 2, h: 1, d: 1, c: '#000000' }];
  it('a 90° rotation turns the front (+z) towards +x and stays in the base', () => {
    const [r] = rotate(k, 1, 8, 8);
    expect(r).toMatchObject({ x: 6, z: 5, w: 1, d: 2 });
  });
  it('four rotations are the identity', () => {
    let r = k;
    for (let i = 0; i < 4; i++) r = rotate(r, 1, 8, 8);
    expect(r).toEqual(k);
  });
  it('180° and 270° rotations', () => {
    expect(rotate(k, 2, 8, 8)[0]).toMatchObject({ x: 5, z: 1, w: 2, d: 1 });
    expect(rotate(k, 3, 8, 8)[0]).toMatchObject({ x: 1, z: 1, w: 1, d: 2 });
  });
});
