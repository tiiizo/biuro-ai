import { describe, expect, it } from 'vitest';
import {
  roomAlarm,
  isAlarmTask,
  daysWaiting,
  BUBBLE_FOOTPRINT,
  LAMP_FOOTPRINT,
  alarmPosition,
  THRESHOLD_DAYS,
} from '../src/alarm';
import { roomSize } from '../src/layout';
import type { Level } from '../src/level';
import type { TaskType } from '../src/schema';

const TODAY = new Date('2026-11-13T10:00:00Z');

function t(types: TaskType[], waitingSince?: string) {
  return { types, ...(waitingSince ? { waitingSince } : {}) };
}

describe('daysWaiting (UTC)', () => {
  it('counts whole calendar days in UTC', () => {
    expect(daysWaiting('2026-11-13', TODAY)).toBe(0);
    expect(daysWaiting('2026-11-06', TODAY)).toBe(7);
    expect(daysWaiting('2026-11-05', TODAY)).toBe(8);
    expect(daysWaiting('2026-11-20', TODAY)).toBe(-7);
  });
  it('the time of the UTC day does not change the result', () => {
    expect(daysWaiting('2026-11-05', new Date('2026-11-13T00:00:00Z'))).toBe(8);
    expect(daysWaiting('2026-11-05', new Date('2026-11-13T23:59:59Z'))).toBe(8);
  });
  it('across a DST change and the end of the year', () => {
    expect(daysWaiting('2026-10-20', new Date('2026-10-28T12:00:00Z'))).toBe(8);
    expect(daysWaiting('2025-12-31', new Date('2026-01-08T12:00:00Z'))).toBe(8);
  });
});

describe('lamp rule: [B] or [?] waiting longer than 7 days', () => {
  it('threshold: 7 days → no, 8 days → yes', () => {
    expect(THRESHOLD_DAYS).toBe(7);
    expect(isAlarmTask(t(['B'], '2026-11-06'), TODAY)).toBe(false);
    expect(isAlarmTask(t(['B'], '2026-11-05'), TODAY)).toBe(true);
    expect(isAlarmTask(t(['?'], '2026-11-06'), TODAY)).toBe(false);
    expect(isAlarmTask(t(['?'], '2026-11-05'), TODAY)).toBe(true);
  });

  it.each<[TaskType[], boolean]>([
    [['B'], true],
    [['?'], true],
    [['B', 'YOU'], true],
    [['B', 'AI'], true],
    [['?', '..'], true],
    [['YOU'], false],
    [['AI'], false],
    [['..'], false],
    [['YOU', 'AI'], false],
  ])('types %j, waiting 30 days → %s', (types, expected) => {
    expect(isAlarmTask(t(types, '2026-10-14'), TODAY)).toBe(expected);
  });

  it('a task without "waiting since" does not light the lamp', () => {
    expect(isAlarmTask(t(['B']), TODAY)).toBe(false);
  });

  it('a future date does not light the lamp', () => {
    expect(isAlarmTask(t(['B'], '2027-01-01'), TODAY)).toBe(false);
  });

  it('roomAlarm: number of tasks and the longest wait', () => {
    expect(roomAlarm([], TODAY)).toEqual({ alarm: false, tasks: 0, longestDays: 0 });
    const a = roomAlarm([t(['B'], '2026-10-22'), t(['?'], '2026-11-03'), t(['YOU'], '2026-01-01'), t(['B'], '2026-11-10')], TODAY);
    expect(a).toEqual({ alarm: true, tasks: 2, longestDays: 22 });
  });
});

describe('lamp and bubble position', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as Level[])('level %i: lamp and bubble inside the room footprint', (level) => {
    const r = { x: -7, z: 4, ...roomSize(level) };
    const { lamp, bubble } = alarmPosition(r);
    expect(lamp.x).toBeGreaterThanOrEqual(r.x);
    expect(lamp.x + LAMP_FOOTPRINT.w).toBeLessThanOrEqual(r.x + r.w);
    expect(lamp.z).toBeGreaterThanOrEqual(r.z);
    expect(lamp.z + LAMP_FOOTPRINT.d).toBeLessThanOrEqual(r.z + r.d);
    expect(bubble.x + BUBBLE_FOOTPRINT.x0).toBeGreaterThanOrEqual(r.x);
    expect(bubble.x + BUBBLE_FOOTPRINT.x1).toBeLessThanOrEqual(r.x + r.w);
    expect(bubble.z + BUBBLE_FOOTPRINT.z0).toBeGreaterThanOrEqual(r.z);
    expect(bubble.z + BUBBLE_FOOTPRINT.z1).toBeLessThanOrEqual(r.z + r.d);
  });
});
