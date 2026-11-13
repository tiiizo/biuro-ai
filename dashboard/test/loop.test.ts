import { describe, expect, it } from 'vitest';
import { frameDue, FPS } from '../src/loop';

/** How many renders per second with rAF ticks every 1000/hz ms (with ±0.3 ms jitter). */
function framesPerSecond(hz: number, state: { dirty: boolean; animate: boolean }, seconds = 2): number {
  let last = -Infinity;
  let n = 0;
  const ticks = hz * seconds;
  for (let i = 1; i <= ticks; i++) {
    const t = (i * 1000) / hz + (i % 2 === 0 ? 0.3 : -0.3);
    if (frameDue({ ...state, t, last })) {
      last = t;
      n++;
    }
  }
  return n / seconds;
}

describe('frameDue', () => {
  it('nothing to draw → no render', () => {
    expect(frameDue({ dirty: false, animate: false, t: 10_000, last: 0 })).toBe(false);
  });

  it('the first change after idling renders at once', () => {
    expect(frameDue({ dirty: true, animate: false, t: 5000, last: 1000 })).toBe(true);
  });

  for (const hz of [60, 120, 144, 240]) {
    it(`${hz} Hz: drag/zoom (dirty frames) and animation — at most ${FPS} fps, not less than 28`, () => {
      for (const state of [
        { dirty: true, animate: false },
        { dirty: false, animate: true },
        { dirty: true, animate: true },
      ]) {
        const fps = framesPerSecond(hz, state);
        expect(fps).toBeLessThanOrEqual(FPS);
        expect(fps).toBeGreaterThanOrEqual(28);
      }
    });
  }
});
