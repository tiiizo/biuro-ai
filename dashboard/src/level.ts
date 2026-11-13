export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * Lower bounds of the `open` ranges for levels 2..10.
 * 0 → 1, 1–2 → 2, 3–4 → 3, 5–7 → 4, 8–11 → 5, 12–16 → 6,
 * 17–23 → 7, 24–32 → 8, 33–45 → 9, 46+ → 10.
 */
export const LEVEL_THRESHOLDS: readonly number[] = [1, 3, 5, 8, 12, 17, 24, 33, 46];

/**
 * Room level (1–10) from `open` = open issues + open pull requests in the repository.
 * Negative, non-integer, infinite or NaN input gives level 1
 * (the parser rejects such values anyway; this is only a safe fallback).
 */
export function roomLevel(open: number): Level {
  if (!Number.isInteger(open) || open < 0) return 1;
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (open >= threshold) level += 1;
  }
  return level as Level;
}
