import { describe, expect, it } from 'vitest';
import { buildingLayout } from '../src/layout';
import { formatMessage, parseOffice } from '../src/parse';
import example from '../../office.example.md?raw';
import readme from '../README.md?raw';
import officeManager from '../../.claude/agents/office-manager.md?raw';

// The sample in the repository root (smoke): it parses without warnings and lays out into a building. The local
// office.md is git-ignored (your data) and is not read by the tests; check it with `npm run validate`.
// Content assertions use fixed copies: test/fixtures/valid.md and test/fixtures/office.md.
describe('office.example.md (repository root, smoke)', () => {
  it('validates without errors or warnings and gives a building layout', () => {
    const r = parseOffice(example);
    expect(r.ok ? r.warnings.map(formatMessage) : []).toEqual([]);
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
