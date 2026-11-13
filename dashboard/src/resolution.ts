// Render resolution chosen by the zoom level. A pure function, tested in test/resolution.test.ts.
//
// The pixel-art look stays: rendering without antialiasing, scaled up in CSS by an integer factor with
// `image-rendering: pixelated`. Only the scale changes:
// - whole-building view (a tile covers few screen pixels) → scale 1: every CSS pixel is a render pixel,
//   so the zoomed-out view has about 2× more pixels per room than with a fixed ~680 px render width;
// - close-up (a tile ≥ 2 × TARGET_PIXELS_PER_TILE screen pixels) → scale 2: chunky pixels in close-ups
//   without losing detail (a voxel then has at least 2 render pixels);
// - large screens: the scale grows until the render fits in MAX_RENDER_PIXELS (performance; the 30 fps
//   limit is in src/loop.ts).

/** Target render pixels per tile (1 tile = 8 voxels → 2 render pixels per voxel). */
export const TARGET_PIXELS_PER_TILE = 16;
/** The largest scale that follows from zooming (2 at 1440 px width). */
export const MAX_ZOOM_SCALE = 2;
/** Upper limit of render pixels (about 1920×1200); above it the scale grows regardless of zoom. */
export const MAX_RENDER_PIXELS = 1920 * 1200;

export type ScaleInput = {
  /** Canvas size in CSS pixels. */
  width: number;
  height: number;
  /** How many CSS pixels one tile covers now (depends on zoom). */
  pixelsPerTile: number;
};

/** Integer CSS scale: 1 render pixel = `scale` × `scale` CSS pixels. */
export function renderScale({ width, height, pixelsPerTile }: ScaleInput): number {
  let scale = 1;
  while (scale < MAX_ZOOM_SCALE && pixelsPerTile / (scale + 1) >= TARGET_PIXELS_PER_TILE) scale++;
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  while (Math.ceil(w / scale) * Math.ceil(h / scale) > MAX_RENDER_PIXELS) scale++;
  return scale;
}
