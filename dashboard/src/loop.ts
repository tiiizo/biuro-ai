// Pace of the scene render loop. A pure function, tested in test/loop.test.ts.
//
// One limit for all frames: animation frames (figures, alarm lamps) and "dirty" frames (dragging, mouse
// wheel, window or data change). requestAnimationFrame ticks at the display rate (up to 120 Hz on
// ProMotion), so without a limit dragging would render 4× more frames than the animation.

/** At most this many frames per second. */
export const FPS = 30;

/**
 * Allowance for rAF timestamp jitter: at 60 Hz two ticks are ~33.3 ms, but sometimes 33.1 ms. Without
 * the allowance every other frame would wait for a third tick (20 fps instead of 30).
 */
export const JITTER_MS = 3;

export type FrameState = {
  /** Something changed (camera, data, size) and the image is out of date. */
  dirty: boolean;
  /** Animation is on and there is something to animate. */
  animate: boolean;
  /** Timestamp of the current rAF tick (ms). */
  t: number;
  /** Timestamp of the last render (ms). */
  last: number;
};

/** Whether to render on this tick: there is something to draw and a frame interval has passed since the last render. */
export function frameDue({ dirty, animate, t, last }: FrameState): boolean {
  if (!dirty && !animate) return false;
  return t - last >= 1000 / FPS - JITTER_MS;
}
