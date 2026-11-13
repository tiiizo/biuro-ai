import { describe, expect, it } from 'vitest';
import { TARGET_PIXELS_PER_TILE, MAX_RENDER_PIXELS, renderScale } from '../src/resolution';

describe('renderScale', () => {
  it('whole-building view (few pixels per tile) → scale 1, i.e. full 1440×900 resolution', () => {
    expect(renderScale({ width: 1440, height: 900, pixelsPerTile: 18 })).toBe(1);
  });

  it('close-up → scale 2 (chunky pixels in close-ups)', () => {
    expect(renderScale({ width: 1440, height: 900, pixelsPerTile: 2 * TARGET_PIXELS_PER_TILE })).toBe(2);
    expect(renderScale({ width: 1440, height: 900, pixelsPerTile: 2 * TARGET_PIXELS_PER_TILE - 1 })).toBe(1);
    expect(renderScale({ width: 1440, height: 900, pixelsPerTile: 400 })).toBe(2);
  });

  it('the scale does not decrease as zoom grows', () => {
    let previous = 0;
    for (let px = 1; px <= 300; px++) {
      const s = renderScale({ width: 1440, height: 900, pixelsPerTile: px });
      expect(s).toBeGreaterThanOrEqual(previous);
      previous = s;
    }
  });

  it('large screens: the render stays within the pixel limit', () => {
    for (const [w, h] of [[2560, 1440], [3840, 2160], [5120, 2880], [1920, 1200]] as const) {
      const s = renderScale({ width: w, height: h, pixelsPerTile: 10 });
      expect(Math.ceil(w / s) * Math.ceil(h / s)).toBeLessThanOrEqual(MAX_RENDER_PIXELS);
      expect(Number.isInteger(s)).toBe(true);
    }
    expect(renderScale({ width: 1920, height: 1200, pixelsPerTile: 10 })).toBe(1);
    expect(renderScale({ width: 3840, height: 2160, pixelsPerTile: 10 })).toBe(2);
  });

  it('zero size (hidden tab) does not break the result', () => {
    expect(renderScale({ width: 0, height: 0, pixelsPerTile: 0 })).toBe(1);
  });
});
