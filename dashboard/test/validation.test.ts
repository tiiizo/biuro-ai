import { describe, expect, it } from 'vitest';
import { COMMENT_LIMIT, SIZE_LIMIT, MAX_COMMENTS, GROWTH_THRESHOLD, validateOffice, validateRun } from '../src/validation';
import sample from './fixtures/office.md?raw';
import valid from './fixtures/valid.md?raw';
import broken from './fixtures/broken.md?raw';

const FIRST_LINK = 'https://github.com/example-org/office/issues/21';
const FIRST_TITLE = '#23 template for the monthly status report';

// validateOffice decides in scripts/update-office.sh whether office.md stays after the agent run or the
// backup is restored (through scripts/validate.mjs).
describe('validateOffice', () => {
  it('accepts a valid file', () => {
    expect(validateOffice(valid)).toEqual({ ok: true, errors: [], warnings: [] });
  });

  it('rejects a broken file with line numbers', () => {
    const r = validateOffice(broken);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.every((b) => /^line \d+: /.test(b))).toBe(true);
  });

  it('rejects an empty file (e.g. a truncated write)', () => {
    expect(validateOffice('').ok).toBe(false);
  });

  it('normalization warnings do not block', () => {
    const r = validateOffice(valid.replace('## Floor:', '## floor:'));
    expect(r.ok).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

// validateRun = `validate.mjs --strict`: after an unattended run it also rejects what an issue or PR could
// inject (prompt injection), and a run in which the agent wrote nothing.
describe('validateRun', () => {
  const previous = sample.replace('> updated: 2026-11-13 07:30', '> updated: 2026-11-12 07:30');
  /** Replaces the first task context (that is where the agent paraphrases issue content). */
  const withContext = (context: string) => sample.replace(/( {2}> context: )[^\n]*/u, (_, p: string) => p + context);
  const errors = (text: string, before: string | undefined = previous) => validateRun(text, before).errors;

  it('accepts the real shape of office.md (fixture) with a new update line', () => {
    expect(validateRun(sample, previous)).toEqual({ ok: true, errors: [], warnings: [] });
    expect(validateRun(sample).ok).toBe(true);
  });

  it('includes parser errors', () => {
    expect(validateRun(broken).ok).toBe(false);
  });

  it('an unchanged file or the same update line is not a success', () => {
    expect(errors(sample, sample).join('\n')).toMatch(/updated: 2026-11-13 07:30 · office-manager" unchanged/u);
    const otherTasks = sample.replace(FIRST_TITLE, `${FIRST_TITLE} (changed)`);
    expect(validateRun(otherTasks, sample).ok).toBe(false);
    // Without a previous version (first run) this condition does not apply.
    expect(validateRun(sample, '').ok).toBe(true);
  });

  it('rejects raw HTML outside comments', () => {
    for (const html of ['<img src=x onerror=alert(1)>', '<a href="https://github.com/x">x</a>', '</b>', '<!DOCTYPE x>', '<?php ?>']) {
      const e = errors(sample.replace(FIRST_TITLE, `${FIRST_TITLE} ${html}`));
      expect(e.join('\n'), html).toMatch(/raw HTML/u);
    }
    // A "<" in plain text is fine.
    expect(validateRun(sample.replace(FIRST_TITLE, `${FIRST_TITLE} < 7 days, 3<5`), previous).ok).toBe(true);
  });

  it('rejects "-->" without an opening (an attempt to close someone else\'s comment)', () => {
    expect(errors(sample.replace(FIRST_TITLE, `${FIRST_TITLE} -->`)).join('\n')).toMatch(/"-->" without an opening/u);
  });

  it('limits the number and length of comments', () => {
    const many = sample + '<!-- x -->\n'.repeat(MAX_COMMENTS);
    expect(errors(many).join('\n')).toMatch(/comments, at most/u);
    const long = sample + `<!-- ${'a'.repeat(COMMENT_LIMIT)} -->\n`;
    expect(errors(long).join('\n')).toMatch(/characters in total/u);
  });

  it('rejects links outside https://github.com/ in tasks, contexts and comments', () => {
    const cases = [
      sample.replace(FIRST_LINK, 'https://example.com/example-org/office/issues/21'),
      sample.replace(FIRST_LINK, 'https://github.com.evil.example/x'),
      sample.replace(FIRST_LINK, 'http://github.com/example-org/office/issues/21'),
      sample.replace(FIRST_LINK, 'https://x@github.com/example-org'),
      withContext('see https://evil.example/?d=secret'),
      withContext('see [here](javascript:alert(1))'),
      withContext('write to mailto:someone@example.com'),
      withContext('go to www.evil-example.com'),
      withContext('image data:image/png;base64,AAAA'),
      sample.replace('-->', 'ftp://evil.example/x\n-->'),
    ];
    for (const c of cases) {
      const r = validateRun(c, previous);
      expect(r.ok).toBe(false);
      expect(r.errors.join('\n')).toMatch(/link outside|address scheme|address without https/u);
    }
    expect(errors(cases[0] ?? '').join('\n')).toMatch(/^line \d+: link outside https:\/\/github.com\//mu);
    // GitHub links in a context and a plain "data:" in text are fine.
    expect(validateRun(withContext('see https://github.com/example-org/office/pull/16.'), previous).ok).toBe(true);
    expect(validateRun(withContext('data: 2026-11-13, file: office.md'), previous).ok).toBe(true);
  });

  it('rejects a file above the fixed size limit', () => {
    const big = sample + '\n'.repeat(SIZE_LIMIT);
    expect(errors(big, '').join('\n')).toMatch(/the limit is 65536 B/u);
  });

  it('rejects a file more than 3× larger than the previous one (above the threshold)', () => {
    const grown = sample + '\n'.repeat(Math.max(GROWTH_THRESHOLD, 3 * sample.length));
    expect(errors(grown).join('\n')).toMatch(/more than 3×/u);
    // A small starter file may grow into a full office (below the threshold).
    expect(validateRun(sample, valid).ok).toBe(true);
  });
});
