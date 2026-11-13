import { quote, officeSchema, TASK_TYPES, type Office } from './schema';
import { isProp } from './props';
import { closest } from './suggest';

export type Message = { line: number; reason: string };

export type Result =
  | { ok: true; office: Office; warnings: Message[] }
  | { ok: false; errors: Message[]; warnings: Message[] };

export function formatMessage(m: Message): string {
  return m.line > 0 ? `line ${m.line}: ${m.reason}` : m.reason;
}

/** Room field keys recognised by the parser. */
export const ROOM_KEYS = ['repo', 'open', 'agents', 'theme', 'colors', 'props'] as const;
type RoomKey = (typeof ROOM_KEYS)[number];

// --- Raw tree: values as text, every node knows its line. ---

type Lines = Record<string, number>;

type RawTask = {
  line: number;
  _lines: Lines;
  types: string[];
  number?: string;
  title: string;
  waitingSince?: string;
  link?: string;
  context?: string;
};

type RawRoom = {
  line: number;
  _lines: Lines;
  name: string;
  repo?: string;
  open?: string;
  agents?: string[];
  theme?: string;
  colors?: string;
  props?: string[];
  tasks: RawTask[];
  hasTasksSection: boolean;
};

type RawFloor = { line: number; name: string; rooms: RawRoom[] };

type RawOffice = {
  line: number;
  _lines: Lines;
  updated?: string;
  floors: RawFloor[];
};

// Headings: the keyword in any letter case, any whitespace. A form other than the canonical one gives a
// "normalized" warning.
const RE_FLOOR = /^##(?!#)\s*(floor)\s*:\s*(.*)$/iu;
const RE_ROOM = /^###(?!#)\s*(room)\s*:\s*(.*)$/iu;
const RE_TASKS = /^####(?!#)\s*(tasks)\s*$/iu;
/** A list marker other than "-": "*", "+", "•". */
const RE_OTHER_MARKER = /^([*+•])(?=\s|$)/u;
const RE_UPDATED = /^>\s*updated:\s*(.*)$/;
const RE_CONTEXT = /^>\s*context:\s*(.*)$/;
const RE_TYPE = /^\[([^\]]*)\]\s*/;
const RE_NUMBER = /^#(\S*)\s*(.*)$/;
const RE_SEGMENT = /^([^:]+):\s*(.*)$/;

/** Field key: case-insensitive, whitespace collapsed to one space. */
function canonicalKey(key: string): string {
  return key.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Appends ` (did you mean "x"?)` when a known key is within edit distance ≤ 2. */
function suggestion(key: string, known: readonly string[]): string {
  const c = closest(key, known);
  return c ? ` (did you mean ${quote(c)}?)` : '';
}

/** Room field separator: "·" (or "•") with any whitespace around it. */
const RE_FIELD_SEP = /\s*[·•]\s*/;
/** Task segment separator: "|" with any whitespace around it. */
const RE_TASK_SEP = /\s*\|\s*/;
/** A known room key with a colon inside a value: a sign of a missing separator. */
const RE_KEY_IN_VALUE = new RegExp(`(?:^|[\\s,;|/])(${ROOM_KEYS.join('|')})\\s*:`, 'iu');
/** A task field inside the title: a sign of a missing "|" separator. */
const RE_FIELD_IN_TITLE = /(?:^|\s)(waiting\s+since|link)\s*:/iu;

const HEADINGS = '"# Office", "## Floor: …", "### Room: …", "#### Tasks"';

/**
 * Replaces HTML comments with spaces (keeping newlines, so line numbers do not change).
 * An unclosed comment is an error; the rest of the file after it is skipped.
 */
function stripComments(text: string, errors: Message[]): string {
  let result = '';
  let pos = 0;
  for (;;) {
    const start = text.indexOf('<!--', pos);
    if (start === -1) return result + text.slice(pos);
    result += text.slice(pos, start);
    const end = text.indexOf('-->', start + 4);
    const upTo = end === -1 ? text.length : end + 3;
    if (end === -1) {
      const line = text.slice(0, start).split('\n').length;
      errors.push({ line, reason: 'unclosed comment "<!--" (missing "-->")' });
    }
    result += text.slice(start, upTo).replace(/[^\n]/g, ' ');
    pos = upTo;
  }
}

function list(value: string): string[] {
  return value.split(',').map((s) => s.trim());
}

/**
 * Parses `office.md`. Never throws: on problems it returns `ok: false` with a list of errors
 * (line number + reason). Warnings (unknown prop, normalized spelling) do not block the result
 * and do not change the meaning of the data.
 */
export function parseOffice(text: string): Result {
  try {
    return parseInner(text);
  } catch (e) {
    return {
      ok: false,
      errors: [{ line: 0, reason: `internal parser error: ${e instanceof Error ? e.message : String(e)}` }],
      warnings: [],
    };
  }
}

function parseInner(text: string): Result {
  const errors: Message[] = [];
  const warnings: Message[] = [];

  if (typeof text !== 'string') {
    return { ok: false, errors: [{ line: 0, reason: 'input is not text' }], warnings };
  }

  const clean = stripComments(text.replace(/^\ufeff/, '').normalize('NFC'), errors);
  const lines = clean.split(/\r?\n/);

  const office: RawOffice = { line: 1, _lines: {}, floors: [] };
  let firstNonEmpty = true;
  let floor: RawFloor | undefined;
  let room: RawRoom | undefined;
  let inTasks = false;
  const floorNames = new Map<string, number>();
  const roomNames = new Map<string, number>();

  const error = (line: number, reason: string) => errors.push({ line, reason });
  const normalizeWord = (line: number, actual: string, canonical: string, prefix: string) => {
    if (actual !== canonical) {
      warnings.push({ line, reason: `normalized heading ${quote(prefix + actual)} → ${quote(prefix + canonical)}` });
    }
  };

  lines.forEach((raw, i) => {
    const nr = i + 1;
    let t = raw.trim();
    if (t === '') return;

    const mm = RE_OTHER_MARKER.exec(t);
    if (mm) {
      warnings.push({ line: nr, reason: `normalized list marker ${quote(mm[1])} → "-"` });
      t = `-${t.slice(mm[0].length)}`;
    }

    if (firstNonEmpty) {
      firstNonEmpty = false;
      if (t === '# Office') {
        office.line = nr;
        return;
      }
      error(nr, `the file must start with the heading "# Office", got ${quote(t)}`);
      office.line = nr;
    }

    if (t === '# Office') {
      error(nr, 'the heading "# Office" may appear only once, at the start of the file');
      return;
    }

    let m: RegExpExecArray | null;

    if ((m = RE_UPDATED.exec(t))) {
      if (office.updated !== undefined) {
        error(nr, 'duplicate "> updated:" line');
      } else if (floor) {
        error(nr, 'the "> updated:" line must come before the first floor');
      } else {
        office.updated = m[1] ?? '';
        office._lines.updated = nr;
      }
      return;
    }

    if ((m = RE_FLOOR.exec(t))) {
      normalizeWord(nr, m[1] ?? '', 'Floor', '## ');
      const name = (m[2] ?? '').trim();
      room = undefined;
      inTasks = false;
      if (!name) {
        error(nr, 'floor without a name (expected "## Floor: name")');
      } else if (floorNames.has(name)) {
        error(nr, `duplicate floor ${quote(name)} (first on line ${floorNames.get(name)})`);
      } else {
        floorNames.set(name, nr);
      }
      floor = { line: nr, name, rooms: [] };
      office.floors.push(floor);
      return;
    }

    if ((m = RE_ROOM.exec(t))) {
      normalizeWord(nr, m[1] ?? '', 'Room', '### ');
      const name = (m[2] ?? '').trim();
      inTasks = false;
      if (!floor) {
        error(nr, 'room before the first floor (add "## Floor: name" above it)');
        room = undefined;
        return;
      }
      if (!name) {
        error(nr, 'room without a name (expected "### Room: name")');
      } else if (roomNames.has(name)) {
        error(nr, `duplicate room ${quote(name)} (first on line ${roomNames.get(name)})`);
      } else {
        roomNames.set(name, nr);
      }
      room = { line: nr, _lines: {}, name, tasks: [], hasTasksSection: false };
      floor.rooms.push(room);
      return;
    }

    if ((m = RE_TASKS.exec(t))) {
      normalizeWord(nr, m[1] ?? '', 'Tasks', '#### ');
      if (!room) {
        error(nr, '"#### Tasks" section outside a room');
      } else if (room.hasTasksSection) {
        error(nr, 'second "#### Tasks" section in the same room');
      } else {
        room.hasTasksSection = true;
        inTasks = true;
      }
      return;
    }

    if (t.startsWith('#')) {
      error(nr, `unknown heading ${quote(t)} (allowed: ${HEADINGS})`);
      return;
    }

    if ((m = RE_CONTEXT.exec(t))) {
      const task = inTasks && room ? room.tasks.at(-1) : undefined;
      if (!task) {
        error(nr, '"> context:" must be directly below a task');
      } else if (task.context !== undefined) {
        error(nr, 'a task can have only one "> context:" line');
      } else {
        task.context = m[1] ?? '';
        task._lines.context = nr;
      }
      return;
    }

    if (t.startsWith('- ') || t === '-') {
      const content = t.slice(1).trim();
      if (inTasks && room) {
        const task = parseTask(content, nr, error, warnings);
        if (task) room.tasks.push(task);
      } else if (room) {
        if (content.startsWith('[')) {
          error(nr, 'task outside the "#### Tasks" section');
        } else {
          parseFields(content, nr, room, error, warnings);
        }
      } else {
        error(nr, content.startsWith('[') ? 'task outside a room' : 'fields outside a room (add "### Room: name" above them)');
      }
      return;
    }

    error(nr, `unrecognised line ${quote(t)}`);
  });

  if (firstNonEmpty) {
    return { ok: false, errors: [{ line: 1, reason: 'the file is empty (expected "# Office")' }], warnings };
  }
  if (office.updated === undefined) {
    error(office.line, 'missing line "> updated: YYYY-MM-DD HH:MM · author" below "# Office"');
  }
  if (office.floors.length === 0) {
    error(office.line, 'no floors (add at least one "## Floor: name")');
  }
  for (const f of office.floors) {
    if (f.rooms.length === 0) warnings.push({ line: f.line, reason: `floor ${quote(f.name)} has no rooms` });
    for (const r of f.rooms) {
      // A room with a repo and no "open" is almost surely an omission or a typo; without this check its level
      // would silently drop to 1.
      if (r.repo !== undefined && r.open === undefined) {
        error(r._lines.repo ?? r.line, `room ${quote(r.name)} has "repo", so it also needs the field "open: number"`);
      }
    }
  }

  // Value validation (zod). Errors are mapped to lines through the path in the raw tree.
  const zodResult = officeSchema.safeParse({ ...office, updated: office.updated ?? '' });
  if (!zodResult.success) {
    for (const issue of zodResult.error.issues) {
      if (issue.path[0] === 'updated' && office.updated === undefined) continue; // already reported
      error(lineForPath(office, issue.path), issue.message);
    }
  }

  const sorted = (k: Message[]) =>
    k
      .filter((x, i, arr) => arr.findIndex((y) => y.line === x.line && y.reason === x.reason) === i)
      .sort((a, b) => a.line - b.line);

  if (errors.length > 0 || !zodResult.success) {
    return { ok: false, errors: sorted(errors), warnings: sorted(warnings) };
  }
  return { ok: true, office: zodResult.data, warnings: sorted(warnings) };
}

function parseFields(
  content: string,
  nr: number,
  room: RawRoom,
  error: (line: number, reason: string) => void,
  warnings: Message[],
): void {
  if (content.includes('•')) {
    warnings.push({ line: nr, reason: 'normalized field separator "•" → "·"' });
  }
  for (const segment of content.split(RE_FIELD_SEP)) {
    const m = RE_SEGMENT.exec(segment.trim());
    if (!m) {
      error(nr, `invalid field ${quote(segment.trim())} (expected "key: value", fields separated by " · ")`);
      continue;
    }
    const rawKey = (m[1] ?? '').trim();
    const key = canonicalKey(rawKey);
    const value = (m[2] ?? '').trim();
    if (!(ROOM_KEYS as readonly string[]).includes(key)) {
      error(nr, `unknown key ${quote(rawKey)}${suggestion(key, ROOM_KEYS)} (allowed: ${ROOM_KEYS.join(', ')})`);
      continue;
    }
    if (rawKey !== key) {
      warnings.push({ line: nr, reason: `normalized key ${quote(rawKey)} → ${quote(key)}` });
    }
    const k = key as RoomKey;
    const mk = RE_KEY_IN_VALUE.exec(value);
    if (mk) {
      error(nr, `the value of ${quote(k)} contains ${quote(`${mk[1]}:`)} (missing " · " separator between fields?)`);
      continue;
    }
    if (room._lines[k] !== undefined) {
      error(nr, `duplicate key ${quote(k)} (first on line ${room._lines[k]})`);
      continue;
    }
    room._lines[k] = nr;
    switch (k) {
      case 'repo':
      case 'open':
      case 'theme':
        room[k] = value;
        break;
      case 'colors':
        if (value.includes(',')) {
          warnings.push({ line: nr, reason: 'normalized comma-separated colors → space-separated' });
        }
        room.colors = value.replace(/,/g, ' ');
        break;
      case 'agents':
        room.agents = value === '' ? [] : list(value);
        break;
      case 'props': {
        const known: string[] = [];
        for (const p of value === '' ? [] : list(value)) {
          if (p === '') continue;
          if (isProp(p)) known.push(p);
          else warnings.push({ line: nr, reason: `unknown prop ${quote(p)} skipped` });
        }
        room.props = known;
        break;
      }
    }
  }
}

const TASK_KEYS = ['waiting since', 'link'] as const;

function parseTask(
  content: string,
  nr: number,
  error: (line: number, reason: string) => void,
  warnings: Message[],
): RawTask | undefined {
  const task: RawTask = { line: nr, _lines: {}, types: [], title: '' };
  let rest = content;
  let m: RegExpExecArray | null;
  while ((m = RE_TYPE.exec(rest))) {
    const rawType = (m[1] ?? '').trim();
    const candidate = rawType === '…' ? '..' : rawType.toUpperCase();
    const known = (TASK_TYPES as readonly string[]).includes(candidate);
    const type = known ? candidate : rawType; // an unknown type stays as written; the schema reports it
    if (known && type !== rawType) {
      warnings.push({ line: nr, reason: `normalized task type ${quote(`[${rawType}]`)} → ${quote(`[${type}]`)}` });
    }
    if (task.types.includes(type)) error(nr, `repeated task type ${quote(`[${type}]`)}`);
    else task.types.push(type);
    rest = rest.slice(m[0].length);
  }

  const [first = '', ...segments] = rest.split(RE_TASK_SEP);
  let title = first.trim();
  const mn = RE_NUMBER.exec(title);
  if (mn) {
    task.number = mn[1] ?? '';
    title = (mn[2] ?? '').trim();
  }
  task.title = title;
  const mf = RE_FIELD_IN_TITLE.exec(title);
  if (mf) {
    error(nr, `task title contains ${quote(`${mf[1]}:`)} (missing " | " separator before the field?)`);
  }

  for (const seg of segments) {
    const ms = RE_SEGMENT.exec(seg.trim());
    const rawKey = ms ? (ms[1] ?? '').trim() : '';
    const key = canonicalKey(rawKey);
    const value = ms ? (ms[2] ?? '').trim() : '';
    if (key === 'waiting since' || key === 'link') {
      if (rawKey !== key) {
        warnings.push({ line: nr, reason: `normalized task field ${quote(rawKey)} → ${quote(key)}` });
      }
      const field = key === 'waiting since' ? 'waitingSince' : 'link';
      if (task[field] !== undefined) {
        error(nr, `duplicate task field ${quote(key)}`);
      } else {
        task[field] = value;
      }
    } else {
      error(
        nr,
        `unknown task field ${quote(seg.trim())}${ms ? suggestion(key, TASK_KEYS) : ''} (allowed: "waiting since: YYYY-MM-DD", "link: URL")`,
      );
    }
  }
  return task;
}

/** The closest line number for a zod error path (e.g. ['floors', 0, 'rooms', 1, 'colors', 2]). */
function lineForPath(root: RawOffice, path: readonly PropertyKey[]): number {
  let line = root.line;
  let node: unknown = root;
  for (const seg of path) {
    if (typeof node !== 'object' || node === null) break;
    const obj = node as Record<PropertyKey, unknown>;
    const objLines = obj._lines as Lines | undefined;
    if (objLines && typeof seg === 'string' && typeof objLines[seg] === 'number') {
      line = objLines[seg];
    }
    node = obj[seg];
    if (typeof node === 'object' && node !== null && typeof (node as { line?: unknown }).line === 'number') {
      line = (node as { line: number }).line;
    }
  }
  return line;
}
