import { describe, expect, it } from 'vitest';
import { parseOffice } from '../src/parse';
import type { Task } from '../src/schema';
import {
  isGithubLink,
  oneLine,
  taskLink,
  longestWaiting,
  waitingText,
  linkWarnings,
  taskRank,
  sortTasks,
  clipboardText,
} from '../src/tasks';
import sample from './fixtures/office.md?raw';

const TODAY = new Date('2026-11-13T12:00:00Z');

function t(types: Task['types'], number: number | undefined, waitingSince?: string, extra: Partial<Task> = {}): Task {
  return {
    types,
    ...(number !== undefined ? { number } : {}),
    title: `task ${number ?? '?'}`,
    ...(waitingSince ? { waitingSince } : {}),
    ...extra,
  };
}

describe('clipboardText', () => {
  it('full format: [room] #N title (waiting N days) — context: … — let\'s discuss.', () => {
    const task = t(['B', 'YOU'], 52, '2026-10-29', {
      title: 'Forecast provider: free tier or paid plan',
      context: 'blocks #55 and #58; the owner compares the offers.',
    });
    // The prefix is the room name from office.md (as in the dashboard), not the repository name.
    expect(clipboardText({ name: 'Weather app' }, task, TODAY)).toBe(
      "[Weather app] #52 Forecast provider: free tier or paid plan (waiting 15 days) — context: blocks #55 and #58; the owner compares the offers — let's discuss.",
    );
  });

  it('number of days: today, 1 day, N days, a future date = since today; days counted in UTC', () => {
    const text = (since: string, today = TODAY) => clipboardText({ name: 'P' }, t(['AI'], 1, since), today);
    expect(text('2026-11-13')).toContain('(waiting since today)');
    expect(text('2026-11-12')).toContain('(waiting 1 day)');
    expect(text('2026-11-11')).toContain('(waiting 2 days)');
    expect(text('2026-10-13')).toContain('(waiting 31 days)');
    expect(text('2026-11-20')).toContain('(waiting since today)');
    // 23:30 in Central Europe on 13 Nov is still 13 Nov 22:30 UTC — still 1 day since 12 Nov.
    expect(text('2026-11-12', new Date('2026-11-13T22:30:00Z'))).toContain('(waiting 1 day)');
    expect(text('2026-11-12', new Date('2026-11-14T00:30:00Z'))).toContain('(waiting 2 days)');
  });

  it('skips the number, date and context when they are missing', () => {
    expect(clipboardText({ name: 'Director' }, t(['..'], undefined, undefined, { title: 'tidy up' }), TODAY)).toBe(
      "[Director] tidy up — let's discuss.",
    );
  });

  it('always one line: newlines, tabs and ESC sequences from office.md do not reach the terminal', () => {
    const task = t(['AI'], 7, '2026-11-12', { title: 'a\nb', context: 'x\u001b[31m\r\ny\u2028z\t.' });
    const s = clipboardText({ name: 'P\nQ' }, task, TODAY);
    expect(s).not.toMatch(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/);
    expect(s).toBe("[P Q] #7 a b (waiting 1 day) — context: x [31m y z — let's discuss.");
  });

  it('no bidi or zero-width characters (Trojan Source): the pasted text looks the way the agent reads it', () => {
    const task = t(['AI'], 8, undefined, {
      title: 'approve\u202e\u2066deployment\u2069\u202c',
      context: 'a\u200bb\u200c\u200dc\u2060d\ufeffe\u00adf\u200e\u200f\u061cg',
    });
    const s = clipboardText({ name: 'Website\u202e' }, task, TODAY);
    expect(s).not.toMatch(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u);
    expect(s).toBe("[Website] #8 approve deployment — context: a b c d e f g — let's discuss.");
    // Accented letters and plain emoji stay. ZWJ (U+200D) is Cf too, so a ZWJ emoji sequence falls apart.
    expect(oneLine('Crème brûlée, naïve café 📋')).toBe('Crème brûlée, naïve café 📋');
  });

  it('waitingText and oneLine', () => {
    expect(waitingText(0)).toBe('waiting since today');
    expect(waitingText(1)).toBe('waiting 1 day');
    expect(waitingText(5)).toBe('waiting 5 days');
    expect(oneLine('  a \n\n b  ')).toBe('a b');
  });
});

describe('sortTasks', () => {
  const list = [
    t(['AI'], 4, '2026-11-12'),
    t(['B', '?'], 63, '2026-11-03'),
    t(['..'], 9),
    t(['YOU'], 2, '2026-10-22'),
    t(['B', 'YOU'], 19, '2026-10-22'),
    t(['?'], 7, '2026-11-12'),
  ];

  it('by days: longest waiting first, tie → more important type, no date at the end', () => {
    expect(sortTasks(list, TODAY, 'days').map((x) => x.number)).toEqual([19, 2, 63, 7, 4, 9]);
  });

  it('by type: [B] > [?] > [YOU] > [AI] > [..], tie → longer waiting', () => {
    expect(sortTasks(list, TODAY, 'type').map((x) => x.number)).toEqual([19, 63, 7, 2, 4, 9]);
  });

  it('does not change the input, a full tie keeps the file order', () => {
    const copy = [...list];
    sortTasks(list, TODAY, 'type');
    expect(list).toEqual(copy);
    const tie = [t(['AI'], undefined, '2026-11-01', { title: 'first' }), t(['AI'], undefined, '2026-11-01', { title: 'second' })];
    expect(sortTasks(tie, TODAY, 'days').map((x) => x.title)).toEqual(['first', 'second']);
  });

  it('task rank is the most important of its types', () => {
    expect(taskRank({ types: ['YOU', 'B'] })).toBe(0);
    expect(taskRank({ types: ['..'] })).toBe(4);
  });
});

describe('longestWaiting', () => {
  it('the 2 longest-waiting tasks of a room', () => {
    const list = [t(['AI'], 1, '2026-11-10'), t(['AI'], 2, '2026-10-01'), t(['?'], 3, '2026-11-01'), t(['B'], 4)];
    expect(longestWaiting(list, TODAY).map((x) => x.number)).toEqual([2, 3]);
  });

  it('fewer than 2 tasks or no dates: returns what there is (dated first)', () => {
    expect(longestWaiting([], TODAY)).toEqual([]);
    expect(longestWaiting([t(['B'], 4), t(['AI'], 5, '2026-11-12')], TODAY).map((x) => x.number)).toEqual([5, 4]);
    expect(longestWaiting([t(['B'], 4)], TODAY, 2)).toHaveLength(1);
  });
});

describe('taskLink', () => {
  it('the link from the file wins, otherwise it is built from the repo and number', () => {
    expect(taskLink({ repo: 'example-org/x' }, { link: 'https://github.com/example-org/x/pull/3', number: 3 })).toBe(
      'https://github.com/example-org/x/pull/3',
    );
    expect(taskLink({ repo: 'example-org/x' }, { number: 3 })).toBe('https://github.com/example-org/x/issues/3');
    expect(taskLink({}, { number: 3 })).toBeUndefined();
  });

  it('only https://github.com/: a link outside GitHub is replaced by the repo + number link, and without them — no link', () => {
    const foreign = 'https://github.com.example.net/example-org/x/pull/3';
    expect(taskLink({ repo: 'example-org/x' }, { link: foreign, number: 3 })).toBe('https://github.com/example-org/x/issues/3');
    expect(taskLink({}, { link: foreign, number: 3 })).toBeUndefined();
    expect(taskLink({ repo: 'example-org/x' }, { link: 'https://example.com/3' })).toBeUndefined();
  });
});

describe('isGithubLink', () => {
  it('lets through only https://github.com/ without a port and login', () => {
    expect(isGithubLink('https://github.com/example-org/x/issues/3')).toBe(true);
    expect(isGithubLink('https://GitHub.com/example-org/x')).toBe(true);
    for (const bad of [
      'http://github.com/example-org/x',
      'https://github.com.example.net/example-org/x',
      'https://example.com/github.com/example-org/x',
      'https://evilgithub.com/example-org/x',
      'https://gist.github.com/example-org/1',
      'https://github.com@example.net/example-org/x',
      'https://user@github.com/example-org/x',
      'https://github.com:8443/example-org/x',
      'javascript:alert(1)',
      'not-an-address',
    ]) {
      expect(isGithubLink(bad), bad).toBe(false);
    }
  });
});

describe('linkWarnings', () => {
  const task = (link: string | undefined, number?: number): Task => ({
    types: ['AI'],
    title: 'title',
    ...(number !== undefined ? { number } : {}),
    ...(link ? { link } : {}),
  });

  it('warns about links outside GitHub and says what is shown instead', () => {
    const office = {
      floors: [
        {
          rooms: [
            {
              name: 'Website',
              repo: 'example-org/website',
              tasks: [task('https://github.com/example-org/website/issues/19', 19), task('https://github.com.example.net/x', 20)],
            },
            { name: 'Director', tasks: [task('https://example.com/a', 5), task(undefined, 6), task('https://example.com/b')] },
          ],
        },
      ],
    } as unknown as Parameters<typeof linkWarnings>[0];
    expect(linkWarnings(office)).toEqual([
      'room "Website", task #20: link outside https://github.com/ (https://github.com.example.net/x) — showing a link built from the repo and number',
      'room "Director", task #5: link outside https://github.com/ (https://example.com/a) — link hidden',
      'room "Director", task "title": link outside https://github.com/ (https://example.com/b) — link hidden',
    ]);
  });

  it('the office.md sample gives no warnings (all links lead to github.com)', () => {
    const r = parseOffice(sample);
    if (!r.ok) throw new Error('fixture office.md is invalid');
    expect(linkWarnings(r.office)).toEqual([]);
  });
});
