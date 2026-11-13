import { z } from 'zod';
import { roomLevel } from './level';
import { PROPS } from './props';

/** Task types: [B] blocks others, [?] owner decision, [YOU] owner's task, [AI] agents' task, [..] in progress. */
export const TASK_TYPES = ['B', '?', 'YOU', 'AI', '..'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TYPE_DESCRIPTIONS: Record<TaskType, string> = {
  B: 'blocks other tasks',
  '?': 'owner decision',
  YOU: "owner's task",
  AI: "agents' task",
  '..': 'in progress',
};

const MAX_QUOTE = 60;

/** A fragment of the input in quotes, cut to a reasonable length. */
export function quote(value: unknown): string {
  const s = String(value);
  return `"${s.length > MAX_QUOTE ? `${s.slice(0, MAX_QUOTE)}…` : s}"`;
}

function validDate(yyyymmdd: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd);
  if (!m) return false;
  const [y, mon, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mon - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mon - 1 && date.getUTCDate() === d;
}

export const dateSchema = z.string().refine(validDate, {
  error: (iss) => `invalid date ${quote(iss.input)} (expected YYYY-MM-DD)`,
});

export const updatedSchema = z.string().transform((s, ctx) => {
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}) · (.+)$/.exec(s.trim());
  const hour = m ? Number(m[2]) : NaN;
  const minute = m ? Number(m[3]) : NaN;
  if (!m || !validDate(m[1]!) || hour > 23 || minute > 59) {
    ctx.addIssue({
      code: 'custom',
      message: `invalid update line ${quote(s)} (expected "YYYY-MM-DD HH:MM · author")`,
    });
    return z.NEVER;
  }
  return { date: m[1]!, time: `${m[2]}:${m[3]}`, author: m[4]!.trim() };
});

const repoSchema = z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/, {
  error: (iss) => `repo must look like "owner/name", got ${quote(iss.input)}`,
});

const openSchema = z
  .string()
  .regex(/^\d{1,6}$/, {
    error: (iss) => `open must be an integer 0–999999, got ${quote(iss.input)}`,
  })
  .transform(Number);

const listSchema = (what: string) =>
  z.array(z.string().min(1, { error: `empty item in the ${what} list` })).min(1, { error: `the ${what} list is empty` });

const colorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
  error: (iss) => `invalid color ${quote(iss.input)} (expected #rgb or #rrggbb)`,
});

const colorsSchema = z
  .string()
  .transform((s) => s.trim().split(/\s+/).filter(Boolean))
  .pipe(
    z
      .array(colorSchema)
      .min(1, { error: 'colors: give 1 to 6 colors' })
      .max(6, { error: 'colors: give 1 to 6 colors' }),
  );

const themeSchema = z
  .string()
  .trim()
  .min(1, { error: 'theme is empty' })
  .max(200, { error: 'theme is longer than 200 characters' });

const linkSchema = z.string().refine(
  (s) => {
    if (!/^https?:\/\/\S+$/.test(s)) return false;
    try {
      new URL(s);
      return true;
    } catch {
      return false;
    }
  },
  { error: (iss) => `invalid link ${quote(iss.input)} (an http:// or https:// address is required)` },
);

const typeSchema = z.enum(TASK_TYPES, {
  error: (iss) =>
    `unknown task type ${quote(`[${String(iss.input)}]`)} (allowed: ${TASK_TYPES.map((t) => `[${t}]`).join(', ')})`,
});

export const taskSchema = z.object({
  types: z.array(typeSchema).min(1, { error: 'task without a type, e.g. "- [AI] title"' }),
  number: z
    .string()
    .regex(/^\d{1,7}$/, { error: (iss) => `invalid number ${quote(`#${String(iss.input)}`)}` })
    .transform(Number)
    .optional(),
  title: z.string().trim().min(1, { error: 'task without a title' }),
  waitingSince: dateSchema.optional(),
  link: linkSchema.optional(),
  context: z.string().trim().min(1, { error: 'empty context' }).optional(),
});

export const roomSchema = z
  .object({
    name: z.string(),
    repo: repoSchema.optional(),
    open: openSchema.optional(),
    agents: listSchema('agents').optional(),
    theme: themeSchema.optional(),
    colors: colorsSchema.optional(),
    props: z.array(z.enum(PROPS)).optional(),
    tasks: z.array(taskSchema),
  })
  .transform((r) => {
    // Default 0 only for a room without a repo; the parser rejects a room with a repo and no "open".
    const open = r.open ?? 0;
    return {
      name: r.name,
      ...(r.repo !== undefined ? { repo: r.repo } : {}),
      open,
      level: roomLevel(open),
      agents: r.agents ?? [],
      ...(r.theme !== undefined ? { theme: r.theme } : {}),
      colors: r.colors ?? [],
      props: r.props ?? [],
      tasks: r.tasks,
    };
  });

export const floorSchema = z.object({
  name: z.string(),
  rooms: z.array(roomSchema),
});

export const officeSchema = z.object({
  updated: updatedSchema,
  floors: z.array(floorSchema),
});

export type Office = z.output<typeof officeSchema>;
export type Floor = z.output<typeof floorSchema>;
export type Room = z.output<typeof roomSchema>;
export type Task = z.output<typeof taskSchema>;
