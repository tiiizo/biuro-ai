import { describe, expect, it } from 'vitest';
import { EXAMPLE_FILE, EXAMPLE_NOTE, OFFICE_FILE, officeSource } from '../src/office-file';

describe('officeSource', () => {
  it('reads the local office.md when it exists', () => {
    expect(officeSource('/repo', (p) => p === '/repo/office.md')).toEqual({ path: '/repo/office.md', example: false });
  });

  it('falls back to office.example.md before the first update', () => {
    expect(officeSource('/repo', () => false)).toEqual({ path: '/repo/office.example.md', example: true });
  });

  it('checks only office.md, not the sample', () => {
    const asked: string[] = [];
    officeSource('/repo', (p) => (asked.push(p), true));
    expect(asked).toEqual(['/repo/office.md']);
  });

  it('names the files and says that the data is an example', () => {
    expect([OFFICE_FILE, EXAMPLE_FILE]).toEqual(['office.md', 'office.example.md']);
    expect(EXAMPLE_NOTE).toMatch(/^showing example data/);
    expect(EXAMPLE_NOTE).toContain(EXAMPLE_FILE);
  });
});
