/** Levenshtein edit distance (insertion, deletion, substitution = 1). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost);
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

/**
 * The closest known name within edit distance ≤ 2 (case-insensitive), e.g. "opne" → "open".
 * Returns undefined when nothing is close enough or two names are equally close.
 */
export function closest(name: string, known: readonly string[]): string | undefined {
  const n = name.toLowerCase();
  let best: string | undefined;
  let min = 3;
  let tie = false;
  for (const k of known) {
    const d = editDistance(n, k.toLowerCase());
    if (d < min) {
      min = d;
      best = k;
      tie = false;
    } else if (d === min) {
      tie = true;
    }
  }
  return best !== undefined && !tie ? best : undefined;
}
