// Room palette derived from `colors:` in office.md. A pure function (no three), tested.
//
// A limited palette per room (pixel art): from 1–6 project colors we make a fixed set of tones for the
// floor, walls, furniture and accents. Light colors → floor, saturated → accents (rug, chairs, posters),
// dark → trim. Walls are a pastel version of the leading color, so the cross-section stays warm and
// readable even with dark brand palettes.

export type Palette = {
  floor: string;
  floorB: string;
  wall: string;
  wallB: string;
  trim: string;
  accent: string;
  accent2: string;
  dark: string;
  light: string;
};

export type Rgb = [number, number, number];

/** Default palette for a room without `colors:`. */
export const DEFAULT_COLORS = ['#6d597a', '#e56b6f', '#eaac8b', '#f8f1e5'];

export function hexToRgb(hex: string): Rgb {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [128, 128, 128];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${k(r)}${k(g)}${k(b)}`;
}

/** Relative luminance (0–1), perceptual approximation. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function saturation(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as Rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

/** Linear mix of two colors: t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

export function darken(hex: string, f: number): string {
  return mix(hex, '#1a1423', f);
}

export function lighten(hex: string, f: number): string {
  return mix(hex, '#ffffff', f);
}

const CREAM = '#f6efe4';

export function roomPalette(colors: readonly string[]): Palette {
  const input = (colors.length > 0 ? colors : DEFAULT_COLORS).map((k) => rgbToHex(hexToRgb(k)));
  const byLuminance = [...input].sort((a, b) => luminance(a) - luminance(b));
  const dark0 = byLuminance[0]!;
  const light0 = byLuminance.at(-1)!;
  // Accents: the most saturated of the not-too-light and not-too-dark colors; otherwise the darkest.
  const candidates = input
    .filter((k) => luminance(k) > 0.12 && luminance(k) < 0.9)
    .sort((a, b) => saturation(b) - saturation(a) || input.indexOf(a) - input.indexOf(b));
  const accent = candidates[0] ?? (luminance(dark0) < 0.12 ? mix(dark0, '#b0a090', 0.35) : dark0);
  const accent2 = candidates[1] ?? (input[0] !== accent ? input[0]! : mix(accent, light0, 0.5));

  // Floor: the light project color broken with cream (warmth), slightly tinted with the accent.
  const floorBase = luminance(light0) > 0.7 ? light0 : lighten(light0, 0.6);
  const floor = mix(mix(floorBase, CREAM, 0.45), accent, 0.1);
  const floorB = darken(floor, 0.08);
  // Walls: the pastel leading color (first in the list) warmed with the accent, so every room has its own
  // character and dark brand palettes do not give grey walls.
  const leading = input[0]!;
  const wall = mix(mix(lighten(leading, 0.55), lighten(accent, 0.55), 0.3), CREAM, 0.25);
  const wallB = darken(wall, 0.12);
  const trim = luminance(dark0) < 0.35 ? dark0 : darken(dark0, 0.45);
  const dark = luminance(dark0) < 0.35 ? dark0 : darken(dark0, 0.5);
  const light = luminance(light0) > 0.8 ? light0 : lighten(light0, 0.7);
  return { floor, floorB, wall, wallB, trim, accent, accent2, dark, light };
}

/** Deterministic hash of a name (FNV-1a) for picking variants without randomness. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
