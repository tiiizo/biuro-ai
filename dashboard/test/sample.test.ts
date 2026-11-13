import { describe, expect, it } from 'vitest';
import { buildingLayout } from '../src/layout';
import { formatMessage, parseOffice } from '../src/parse';
import live from '../../office.md?raw';
import readme from '../README.md?raw';
import officeManager from '../../.claude/agents/office-manager.md?raw';

// The only test on the live office.md (smoke): the file parses and lays out into a building. It does not
// check the content (list, order, room sizes), because office-manager changes it on every run.
// Content assertions use fixed copies: test/fixtures/valid.md and test/fixtures/office.md.
describe('office.md (repository root, smoke)', () => {
  it('validates without errors and gives a building layout', () => {
    const r = parseOffice(live);
    expect(r.ok ? [] : r.errors.map(formatMessage)).toEqual([]);
    if (!r.ok) return;
    expect(() => buildingLayout(r.office.floors)).not.toThrow();
  });
});

describe('example in dashboard/README.md', () => {
  it('validates without errors and warnings', () => {
    const block = /```markdown\n([\s\S]*?)```/.exec(readme)?.[1];
    expect(block).toBeDefined();
    const r = parseOffice(block ?? '');
    expect(r.ok ? r.warnings : [...r.errors, ...r.warnings]).toEqual([]);
    expect(r.ok).toBe(true);
  });
});

// The office-manager agent has no shell and copies the example from its own instructions,
// so that example must always pass the parser.
describe('example in .claude/agents/office-manager.md', () => {
  it('validates without errors and warnings', () => {
    const block = /```markdown\n([\s\S]*?)```/.exec(officeManager)?.[1];
    expect(block).toBeDefined();
    const r = parseOffice(block ?? '');
    expect(r.ok ? r.warnings : [...r.errors, ...r.warnings]).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
