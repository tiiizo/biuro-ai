// Room alarm lamp rule. A pure function, tested in test/alarm.test.ts.
//
// The lamp and the "!" bubble appear when a room has a [B] (blocks) or [?] (owner decision) task waiting
// LONGER than 7 days (`waiting since` at least 8 days ago). Other types ([YOU], [AI], [..]) do not light
// the lamp; neither does a task without `waiting since` (we do not know how long it has waited).
// Dates are UTC (the agent writes them that way); "today" is the UTC date of the given moment.
import type { Task } from './schema';

export const THRESHOLD_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `waitingSince` (YYYY-MM-DD, UTC) to the UTC date of `today`. Negative for future dates. */
export function daysWaiting(waitingSince: string, today: Date): number {
  const [y, m, d] = waitingSince.split('-').map(Number) as [number, number, number];
  const from = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((now - from) / DAY_MS);
}

export function isAlarmTask(t: Pick<Task, 'types' | 'waitingSince'>, today: Date): boolean {
  if (!t.waitingSince) return false;
  if (!t.types.includes('B') && !t.types.includes('?')) return false;
  return daysWaiting(t.waitingSince, today) > THRESHOLD_DAYS;
}

export type Alarm = { alarm: boolean; tasks: number; longestDays: number };

export function roomAlarm(tasks: ReadonlyArray<Pick<Task, 'types' | 'waitingSince'>>, today: Date): Alarm {
  const alarming = tasks.filter((t) => isAlarmTask(t, today));
  return {
    alarm: alarming.length > 0,
    tasks: alarming.length,
    longestDays: Math.max(0, ...alarming.map((t) => daysWaiting(t.waitingSince!, today))),
  };
}

// --- Position of the lamp and the "!" bubble (in tiles, relative to the room) ---

/** Footprint of the post with the beacon (base 2.4 voxels = 0.3 tiles). */
export const LAMP_FOOTPRINT = { w: 0.3, d: 0.3 } as const;
/** Footprint of the "!" bubble relative to its anchor (with outline: −1.4…9.4 × −0.3…2.3 voxels). */
export const BUBBLE_FOOTPRINT = { x0: -0.175, x1: 1.175, z0: -0.0375, z1: 0.2875 } as const;

/**
 * The lamp stands in the front-left corner of the room and the bubble hangs above it — both inside the room
 * footprint (also seen from above), so the alarm cannot be attributed to a neighbouring room across the
 * corridor. Front of the room, because the back is sometimes hidden by the slab of the floor above.
 */
export function alarmPosition(r: { x: number; z: number; w: number; d: number }): {
  lamp: { x: number; z: number };
  bubble: { x: number; z: number };
} {
  return {
    lamp: { x: r.x + 0.08, z: r.z + r.d - 0.38 },
    // The bubble is not wider than the room: even a 2-tile room fits it with room to spare.
    bubble: { x: r.x + 0.1 - BUBBLE_FOOTPRINT.x0, z: r.z + r.d - 0.1 - BUBBLE_FOOTPRINT.z1 },
  };
}
