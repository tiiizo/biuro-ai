import { describe, expect, it } from 'vitest';
import { formatMessage, parseOffice, type Result } from '../src/parse';
import valid from './fixtures/valid.md?raw';
import broken from './fixtures/broken.md?raw';

const HEADER = '# Office\n> updated: 2026-11-12 10:00 · test\n';
const ROOM = `${HEADER}## Floor: A\n### Room: X\n`; // room on line 4, first content line = 5

function errors(r: Result) {
  if (r.ok) throw new Error('expected errors, got ok');
  return r.errors;
}

function expectError(text: string, line: number, fragment: string | RegExp) {
  const e = errors(parseOffice(text));
  const match = e.find(
    (k) => k.line === line && (typeof fragment === 'string' ? k.reason.includes(fragment) : fragment.test(k.reason)),
  );
  expect(match, `no error on line ${line} with "${String(fragment)}"; got: ${e.map(formatMessage).join(' | ')}`).toBeDefined();
}

describe('parseOffice — valid file', () => {
  const r = parseOffice(valid);

  it('returns ok without warnings', () => {
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual([]);
  });

  it('rebuilds the full structure', () => {
    if (!r.ok) throw new Error(r.errors.map(formatMessage).join('\n'));
    expect(r.office).toEqual({
      updated: { date: '2026-11-12', time: '21:30', author: 'office-manager' },
      floors: [
        {
          name: 'Headquarters',
          rooms: [
            {
              name: 'Director',
              open: 0,
              level: 1,
              agents: ['director'],
              theme: 'office with a view',
              colors: ['#334455', '#fc0'],
              props: ['big-desk', 'bookshelf', 'plant'],
              tasks: [],
            },
          ],
        },
        {
          name: 'Projects',
          rooms: [
            {
              name: 'Demo shop',
              repo: 'example-org/demo-shop',
              open: 9,
              level: 5,
              agents: ['developer', 'reviewer'],
              colors: [],
              props: [],
              tasks: [
                {
                  types: ['B', 'YOU'],
                  number: 123,
                  title: 'answers from the client',
                  waitingSince: '2026-01-15',
                  link: 'https://example.com/example-org/demo-shop/issues/123',
                  context: 'payments, shipping, DNS',
                },
                { types: ['?'], title: 'courier yes or no' },
                { types: ['..'], title: 'staging', link: 'https://example.com/a?b=c' },
              ],
            },
          ],
        },
      ],
    });
  });

  it('accepts CRLF, BOM and task segments in any order', () => {
    const text = `\ufeff${ROOM}#### Tasks\n- [AI] t | link: https://a.example | waiting since: 2026-01-31\n`.replace(/\n/g, '\r\n');
    const result = parseOffice(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.office.floors[0]?.rooms[0]?.tasks[0]).toEqual({
        types: ['AI'],
        title: 't',
        link: 'https://a.example',
        waitingSince: '2026-01-31',
      });
    }
  });
});

describe('parseOffice — errors with line numbers', () => {
  it('empty file', () => expectError('', 1, 'empty'));
  it('missing # Office', () => expectError('## Floor: A\n', 1, '"# Office"'));
  it('missing update line', () => expectError('# Office\n## Floor: A\n### Room: X\n', 1, 'missing line "> updated'));
  it('invalid date in the update line', () =>
    expectError('# Office\n> updated: 2026-02-30 10:00 · a\n## Floor: A\n### Room: X\n', 2, 'invalid update line'));
  it('invalid time in the update line', () =>
    expectError('# Office\n> updated: 2026-02-03 24:00 · a\n## Floor: A\n### Room: X\n', 2, 'invalid update line'));
  it('no floors', () => expectError(HEADER, 1, 'no floors'));
  it('room before a floor', () => expectError(`${HEADER}### Room: X\n## Floor: A\n`, 3, 'room before the first floor'));
  it('task outside "#### Tasks"', () => expectError(`${ROOM}- [AI] something\n`, 5, 'outside the "#### Tasks" section'));
  it('unknown type [X]', () => expectError(`${ROOM}#### Tasks\n- [X] something\n`, 6, 'unknown task type "[X]"'));
  it('no type', () => expectError(`${ROOM}#### Tasks\n- something\n`, 6, 'task without a type'));
  it('repeated type', () => expectError(`${ROOM}#### Tasks\n- [AI][AI] something\n`, 6, 'repeated task type'));
  it('task without a title', () => expectError(`${ROOM}#### Tasks\n- [AI]\n`, 6, 'without a title'));
  it('invalid hex', () => expectError(`${ROOM}- colors: #fff #zzz\n`, 5, 'invalid color "#zzz"'));
  it('too many colors', () => expectError(`${ROOM}- colors: #000 #111 #222 #333 #444 #555 #666\n`, 5, '1 to 6'));
  it('open: -3', () => expectError(`${ROOM}- open: -3\n`, 5, 'open must be an integer'));
  it('open: abc', () => expectError(`${ROOM}- open: abc\n`, 5, 'open must be an integer'));
  it('invalid repo', () => expectError(`${ROOM}- repo: no-slash\n`, 5, 'owner/name'));
  it('invalid waiting since date', () =>
    expectError(`${ROOM}#### Tasks\n- [?] x | waiting since: 2026-11-31\n`, 6, 'invalid date "2026-11-31"'));
  it('non-http link', () => expectError(`${ROOM}#### Tasks\n- [?] x | link: javascript:alert(1)\n`, 6, 'invalid link'));
  it('unknown task field', () => expectError(`${ROOM}#### Tasks\n- [?] x | due: tomorrow\n`, 6, 'unknown task field'));
  it('duplicate room', () => expectError(`${ROOM}## Floor: B\n### Room: X\n`, 6, 'duplicate room "X" (first on line 4)'));
  it('duplicate floor', () => expectError(`${ROOM}## Floor: A\n### Room: Y\n`, 5, 'duplicate floor'));
  it('duplicate key', () => expectError(`${ROOM}- open: 1\n- open: 2\n`, 6, 'duplicate key "open" (first on line 5)'));
  it('context without a task', () => expectError(`${ROOM}#### Tasks\n  > context: x\n`, 6, 'directly below a task'));
  it('second context', () => expectError(`${ROOM}#### Tasks\n- [AI] a\n  > context: x\n  > context: y\n`, 8, 'only one'));
  it('junk line', () => expectError(`${ROOM}lorem ipsum\n`, 5, 'unrecognised line "lorem ipsum"'));
  it('unknown heading', () => expectError(`${ROOM}## Storey: x\n`, 5, 'unknown heading'));
  it('an unknown lower-case type stays as written in the error', () =>
    expectError(`${ROOM}#### Tasks\n- [x] something\n`, 6, 'unknown task type "[x]"'));
  it('an unknown key is an error with a suggestion', () =>
    expectError(`${ROOM}- opem: 39\n`, 5, 'unknown key "opem" (did you mean "open"?)'));
  it('an unknown key without a close suggestion', () => {
    const e = errors(parseOffice(`${ROOM}- level: 2\n`));
    expect(e).toEqual([{ line: 5, reason: 'unknown key "level" (allowed: repo, open, agents, theme, colors, props)' }]);
  });
  it('an unknown task field with a suggestion', () =>
    expectError(`${ROOM}#### Tasks\n- [?] x | waitingsince: 2026-01-01\n`, 6, '(did you mean "waiting since"?)'));
  it('repo without open', () =>
    expectError(`${ROOM}- agents: a\n- repo: example-org/x\n`, 6, 'room "X" has "repo", so it also needs the field "open'));
  it('repo with a typo in open gives both errors', () => {
    const e = errors(parseOffice(`${ROOM}- repo: example-org/x · Opem: 39\n`));
    expect(e.map((k) => k.reason).join('\n')).toMatch(/unknown key "Opem" \(did you mean "open"\?\)/);
    expect(e.map((k) => k.reason).join('\n')).toMatch(/also needs the field "open/);
  });
  it('field without a colon', () => expectError(`${ROOM}- repo example-org/x\n`, 5, 'invalid field'));
  it('unclosed comment', () => expectError(`${ROOM}<!-- no end\n`, 5, 'unclosed comment'));

  it('collects all errors at once, sorted by line', () => {
    const e = errors(parseOffice(broken));
    expect(e.map((k) => k.line)).toEqual([2, 4, 7, 7, 8, 10]);
    expect(e.map(formatMessage).every((s) => /^line \d+: .+/.test(s))).toBe(true);
  });
});

describe('parseOffice — separators', () => {
  it.each([
    ['x |waiting since: 2026-10-28', { waitingSince: '2026-10-28' }],
    ['x| link: https://a.example', { link: 'https://a.example' }],
    ['x|waiting since: 2026-10-28|link: https://a.example', { waitingSince: '2026-10-28', link: 'https://a.example' }],
    ['x   |   link: https://a.example', { link: 'https://a.example' }],
  ])('"|" without spaces / with many spaces: %s', (task, fields) => {
    const r = parseOffice(`${ROOM}#### Tasks\n- [?] ${task}\n`);
    expect(r.ok ? [] : r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    if (r.ok) expect(r.office.floors[0]?.rooms[0]?.tasks[0]).toEqual({ types: ['?'], title: 'x', ...fields });
  });

  it.each([['- theme: studio·colors: #fff'], ['- theme: studio  ·  colors: #fff'], ['- theme: studio ·colors: #fff']])(
    '"·" without spaces / with many spaces: %s',
    (line) => {
      const r = parseOffice(`${ROOM}${line}\n`);
      expect(r.ok).toBe(true);
      expect(r.warnings).toEqual([]);
      if (r.ok) expect(r.office.floors[0]?.rooms[0]).toMatchObject({ theme: 'studio', colors: ['#fff'] });
    },
  );

  it('"•" as a field separator: normalized with a warning', () => {
    const r = parseOffice(`${ROOM}- theme: studio • colors: #fff\n`);
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual([{ line: 5, reason: 'normalized field separator "•" → "·"' }]);
    if (r.ok) expect(r.office.floors[0]?.rooms[0]).toMatchObject({ theme: 'studio', colors: ['#fff'] });
  });

  it('theme does not swallow the next field with a wrong separator', () =>
    expectError(`${ROOM}- theme: studio, colors: #fff\n`, 5, 'the value of "theme" contains "colors:"'));
  it('agents do not swallow the next field', () =>
    expectError(`${ROOM}- agents: a, b | Props: lamp\n`, 5, 'the value of "agents" contains "Props:"'));
  it('a task field in the title without "|" is an error', () =>
    expectError(`${ROOM}#### Tasks\n- [?] x waiting since: 2026-10-28\n`, 6, 'task title contains "waiting since:"'));
  it('a link in the title without "|" is an error', () =>
    expectError(`${ROOM}#### Tasks\n- [?] x, link: https://a.example\n`, 6, 'task title contains "link:"'));
  it('a plain colon in the title is allowed', () => {
    const r = parseOffice(`${ROOM}#### Tasks\n- [YOU] Search Console: indexing\n`);
    expect(r.ok).toBe(true);
  });
});

describe('parseOffice — normalization of cosmetic variants (warning, result ok)', () => {
  function ok(text: string) {
    const r = parseOffice(text);
    if (!r.ok) throw new Error(r.errors.map(formatMessage).join('\n'));
    return r;
  }

  it.each([
    ['## floor: A', 'normalized heading "## floor" → "## Floor"'],
    ['## FLOOR: A', 'normalized heading "## FLOOR" → "## Floor"'],
  ])('%s', (heading, reason) => {
    const r = ok(`${HEADER}${heading}\n### Room: X\n`);
    expect(r.warnings).toEqual([{ line: 3, reason }]);
    expect(r.office.floors[0]?.name).toBe('A');
  });

  it('whitespace in headings without a warning', () => {
    const r = ok(`${HEADER}##  Floor :  A\n###Room:X\n####   Tasks\n- [AI] t\n`);
    expect(r.warnings).toEqual([]);
    expect(r.office.floors[0]?.name).toBe('A');
    expect(r.office.floors[0]?.rooms[0]?.name).toBe('X');
  });

  it('### room: in lower case', () => {
    const r = ok(`${HEADER}## Floor: A\n### room: X\n`);
    expect(r.warnings).toEqual([{ line: 4, reason: 'normalized heading "### room" → "### Room"' }]);
    expect(r.office.floors[0]?.rooms[0]?.name).toBe('X');
  });

  it('#### tasks in lower case', () => {
    const r = ok(`${ROOM}#### tasks\n- [AI] t\n`);
    expect(r.warnings).toEqual([{ line: 5, reason: 'normalized heading "#### tasks" → "#### Tasks"' }]);
  });

  it.each([
    ['[you]', 'YOU'],
    ['[ai]', 'AI'],
    ['[b]', 'B'],
    ['[…]', '..'],
  ])('type %s → [%s]', (written, type) => {
    const r = ok(`${ROOM}#### Tasks\n- ${written} t\n`);
    expect(r.warnings).toEqual([{ line: 6, reason: `normalized task type "${written}" → "[${type}]"` }]);
    expect(r.office.floors[0]?.rooms[0]?.tasks[0]?.types).toEqual([type]);
  });

  it.each(['*', '+', '•'])('list marker "%s" → "-"', (marker) => {
    const r = ok(`${ROOM}${marker} open: 3\n#### Tasks\n${marker} [AI] t\n`);
    expect(r.warnings).toEqual([
      { line: 5, reason: `normalized list marker "${marker}" → "-"` },
      { line: 7, reason: `normalized list marker "${marker}" → "-"` },
    ]);
    expect(r.office.floors[0]?.rooms[0]).toMatchObject({ open: 3, tasks: [{ types: ['AI'], title: 't' }] });
  });

  it('comma-separated colors', () => {
    const r = ok(`${ROOM}- colors: #fff, #000,#123\n`);
    expect(r.warnings).toEqual([{ line: 5, reason: 'normalized comma-separated colors → space-separated' }]);
    expect(r.office.floors[0]?.rooms[0]?.colors).toEqual(['#fff', '#000', '#123']);
  });

  it('semantics stay strict: wrong type, date, link and repo are still errors', () => {
    const e = errors(
      parseOffice(`${ROOM}- repo: ExampleOrg · open: 1\n#### Tasks\n* [yes] t | Waiting since: 28.10.2026 | Link: www.a.example\n`),
    );
    expect(e.map((k) => k.reason).join('\n')).toMatch(/owner\/name/);
    expect(e.map((k) => k.reason).join('\n')).toMatch(/unknown task type "\[yes\]"/);
    expect(e.map((k) => k.reason).join('\n')).toMatch(/invalid date/);
    expect(e.map((k) => k.reason).join('\n')).toMatch(/invalid link/);
  });
});

describe('parseOffice — warnings (result still ok)', () => {
  it('an unknown prop is skipped with a warning', () => {
    const r = parseOffice(`${ROOM}- props: plant, unicorn\n`);
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual([{ line: 5, reason: 'unknown prop "unicorn" skipped' }]);
    if (r.ok) expect(r.office.floors[0]?.rooms[0]?.props).toEqual(['plant']);
  });

  it('field key in any letter case, with a warning', () => {
    const r = parseOffice(`${ROOM}- Open: 39 · REPO: example-org/x\n`);
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual([
      { line: 5, reason: 'normalized key "Open" → "open"' },
      { line: 5, reason: 'normalized key "REPO" → "repo"' },
    ]);
    if (r.ok) expect(r.office.floors[0]?.rooms[0]).toMatchObject({ repo: 'example-org/x', open: 39, level: 9 });
  });

  it('task field in any letter case, with a warning', () => {
    const r = parseOffice(`${ROOM}#### Tasks\n- [?] x | Waiting  since: 2026-10-28\n`);
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual([{ line: 6, reason: 'normalized task field "Waiting  since" → "waiting since"' }]);
    if (r.ok) expect(r.office.floors[0]?.rooms[0]?.tasks[0]?.waitingSince).toBe('2026-10-28');
  });

  it('a floor without rooms gives a warning', () => {
    const r = parseOffice(`${ROOM}## Floor: Empty\n`);
    expect(r.ok).toBe(true);
    expect(r.warnings[0]).toEqual({ line: 5, reason: 'floor "Empty" has no rooms' });
  });

  it('HTML comments are ignored and do not shift line numbers', () => {
    expectError(`<!-- a\nb -->\n${ROOM}- open: x\n`, 7, 'open');
  });
});

describe('parseOffice — robustness (never throws)', () => {
  it.each([
    ['empty', ''],
    ['whitespace only', ' \n\t\n'],
    ['binary junk', '\u0000\u0001\uffff\uD800naïve café\u0007'],
    ['very long line', `# Office\n${'x'.repeat(100_000)}`],
  ])('%s', (_, text) => {
    expect(() => parseOffice(text)).not.toThrow();
    expect(parseOffice(text).ok).toBe(false);
  });

  it('non-string', () => {
    expect(() => parseOffice(undefined as unknown as string)).not.toThrow();
    expect(parseOffice(42 as unknown as string).ok).toBe(false);
  });

  it('random inputs from syntax fragments', () => {
    const pieces = ['# Office', '## Floor: A', '### Room: X', '#### Tasks', '- [AI] t', '- open: 3',
      '  > context: k', '> updated: 2026-01-01 00:00 · a', '<!--', '-->', '- [', ' | ', '·', '\n', '#'];
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (let i = 0; i < 500; i++) {
      const n = Math.floor(rnd() * 30);
      const text = Array.from({ length: n }, () => pieces[Math.floor(rnd() * pieces.length)]).join(rnd() > 0.5 ? '\n' : '');
      const r = parseOffice(text);
      expect(typeof r.ok).toBe('boolean');
      if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
    }
  });
});
