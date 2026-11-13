// Room tasks in the interface: sorting, picking the longest-waiting ones and the clipboard text.
// Pure functions without the DOM, tested in test/tasks.test.ts.
import { daysWaiting } from './alarm';
import { TASK_TYPES, type Office, type Room, type Task, type TaskType } from './schema';

export type SortKey = 'days' | 'type';

/** Type rank by the order of TASK_TYPES: [B] first, then [?], [YOU], [AI], [..]. */
const RANK: Readonly<Record<TaskType, number>> = Object.fromEntries(TASK_TYPES.map((t, i) => [t, i])) as Record<
  TaskType,
  number
>;

/** Task rank = the most important of its types (e.g. [B][YOU] counts as [B]). */
export function taskRank(t: Pick<Task, 'types'>): number {
  return Math.min(TASK_TYPES.length, ...t.types.map((x) => RANK[x]));
}

/** Whole days of waiting (at least 0; a future date = 0), or undefined without `waiting since`. */
export function taskDays(t: Pick<Task, 'waitingSince'>, today: Date): number | undefined {
  return t.waitingSince ? Math.max(0, daysWaiting(t.waitingSince, today)) : undefined;
}

/** "waiting since today", "waiting 1 day", "waiting 15 days". */
export function waitingText(days: number): string {
  if (days <= 0) return 'waiting since today';
  return days === 1 ? 'waiting 1 day' : `waiting ${days} days`;
}

/**
 * A new array of tasks, sorted:
 * - `days`: longest waiting first (no date at the end), tie → more important type, then number;
 * - `type`: more important type first ([B], [?], [YOU], [AI], [..]), tie → longer waiting, then number.
 * A full tie keeps the order from office.md.
 */
export function sortTasks<T extends Pick<Task, 'types' | 'waitingSince' | 'number'>>(
  tasks: readonly T[],
  today: Date,
  key: SortKey,
): T[] {
  const days = (t: T) => taskDays(t, today) ?? -1;
  const byDays = (a: T, b: T) => days(b) - days(a);
  const byType = (a: T, b: T) => taskRank(a) - taskRank(b);
  const byNumber = (a: T, b: T) => (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER);
  const order = key === 'days' ? [byDays, byType, byNumber] : [byType, byDays, byNumber];
  return tasks
    .map((t, i) => ({ t, i }))
    .sort((a, b) => {
      for (const f of order) {
        const r = f(a.t, b.t);
        if (r !== 0) return r;
      }
      return a.i - b.i;
    })
    .map(({ t }) => t);
}

/** The `n` longest-waiting tasks (for the tooltip above a room). Tasks without a date only if others run out. */
export function longestWaiting<T extends Pick<Task, 'types' | 'waitingSince' | 'number'>>(
  tasks: readonly T[],
  today: Date,
  n = 2,
): T[] {
  return sortTasks(tasks, today, 'days').slice(0, Math.max(0, n));
}

/**
 * Text pasted into a terminal (into the conversation with the director). One line without control and
 * invisible characters:
 * - Cc (C0/C1, e.g. ESC, CR/LF, NEL): pasting a newline or an ESC sequence could send a command or change
 *   the terminal state;
 * - Cf (bidi U+202A–202E and U+2066–2069, direction marks, zero-width U+200B–200D, U+2060, U+FEFF, soft
 *   hyphen): the pasted text would look different from what the agent reads ("Trojan Source");
 * - Zl/Zp (U+2028/2029): line and paragraph separators.
 */
export function oneLine(s: string): string {
  return s
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** `[room] #19 title (waiting 15 days) — context: … — let's discuss.` Missing parts are skipped. */
export function clipboardText(room: Pick<Room, 'name'>, t: Task, today: Date): string {
  const parts = [`[${oneLine(room.name)}]`];
  if (t.number !== undefined) parts.push(`#${t.number}`);
  parts.push(oneLine(t.title));
  const days = taskDays(t, today);
  if (days !== undefined) parts.push(`(${waitingText(days)})`);
  let text = parts.join(' ');
  const context = t.context ? oneLine(t.context).replace(/[.;,\s]+$/, '') : '';
  if (context) text += ` — context: ${context}`;
  return `${text} — let's discuss.`;
}

/**
 * Whether an address leads to GitHub: exactly `https://github.com/…`, no port and no credentials.
 * Rejects e.g. `http://`, `github.com.example.net`, `example.com/github.com/…` and `https://x@github.com/`.
 */
export function isGithubLink(address: string): boolean {
  let u: URL;
  try {
    u = new URL(address);
  } catch {
    return false;
  }
  return u.protocol === 'https:' && u.hostname === 'github.com' && u.port === '' && u.username === '' && u.password === '';
}

/** A link built from the room repo and the number (GitHub redirects issue ↔ PR); `repo` is validated by the schema. */
function linkFromRepo(room: Pick<Room, 'repo'>, t: Pick<Task, 'number'>): string | undefined {
  return room.repo && t.number !== undefined ? `https://github.com/${room.repo}/issues/${t.number}` : undefined;
}

/**
 * The task link: from office.md if it leads to https://github.com/; otherwise (or without a link) — from the
 * room repo and number, and without those — none. A link outside GitHub goes to the warnings (linkWarnings).
 */
export function taskLink(room: Pick<Room, 'repo'>, t: Pick<Task, 'link' | 'number'>): string | undefined {
  if (t.link && isGithubLink(t.link)) return t.link;
  return linkFromRepo(room, t);
}

/** Warnings for the dashboard header: task links outside https://github.com/ and what is shown instead. */
export function linkWarnings(office: Pick<Office, 'floors'>): string[] {
  const result: string[] = [];
  for (const floor of office.floors) {
    for (const room of floor.rooms) {
      for (const t of room.tasks) {
        if (!t.link || isGithubLink(t.link)) continue;
        const task = t.number !== undefined ? `#${t.number}` : `"${oneLine(t.title)}"`;
        const instead = linkFromRepo(room, t) ? 'showing a link built from the repo and number' : 'link hidden';
        result.push(`room "${room.name}", task ${task}: link outside https://github.com/ (${oneLine(t.link)}) — ${instead}`);
      }
    }
  }
  return result;
}
