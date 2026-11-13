import { describe, expect, it } from 'vitest';
import { hexToRgb, luminance, mix, roomPalette, rgbToHex, hash } from '../src/palette';
import { parseOffice } from '../src/parse';
import sample from './fixtures/office.md?raw';

const HEX = /^#[0-9a-f]{6}$/;

describe('roomPalette', () => {
  const cases: string[][] = [
    [],
    ['#fff'],
    ['#000000'],
    ['#2c2e47', '#8b98ad', '#eef0f6', '#d90429'],
    ['#0a3a7a', '#f2a541', '#ffffff'],
    ['#101010', '#e5383b', '#fafaf0'],
    ['#fcbf49', '#3b82f6', '#f72585'],
    ['#123', '#456', '#789', '#abc', '#def', '#000'],
  ];

  it.each(cases.map((k) => [k.join(' ') || '(none)', k]))('%s → valid #rrggbb colors', (_, colors) => {
    const p = roomPalette(colors as string[]);
    for (const k of Object.values(p)) expect(k).toMatch(HEX);
  });

  it('is deterministic', () => {
    expect(roomPalette(['#0a3a7a', '#f2a541'])).toEqual(roomPalette(['#0a3a7a', '#f2a541']));
  });

  it('floor and walls are light (a readable cross-section), trim darker than the floor', () => {
    for (const colors of cases) {
      const p = roomPalette(colors);
      expect(luminance(p.floor)).toBeGreaterThan(0.6);
      expect(luminance(p.wall)).toBeGreaterThan(0.5);
      expect(luminance(p.trim)).toBeLessThan(luminance(p.floor));
    }
  });

  it('the accent comes from the project colors when there is a saturated one', () => {
    expect(roomPalette(['#101010', '#e5383b', '#fafaf0']).accent).toBe('#e5383b');
    expect(roomPalette(['#0a3a7a', '#f2a541', '#ffffff']).accent).toBe('#f2a541');
  });

  it('different palettes in office.md give different walls', () => {
    const r = parseOffice(sample);
    if (!r.ok) throw new Error('office.md does not validate');
    const palettes = [...new Set(r.office.floors.flatMap((f) => f.rooms).map((x) => x.colors.join(' ')))].filter(Boolean);
    const walls = new Set(palettes.map((k) => roomPalette(k.split(' ')).wall));
    expect(walls.size).toBe(palettes.length);
  });
});

describe('color tools', () => {
  it('hex ↔ rgb', () => {
    expect(hexToRgb('#abc')).toEqual([0xaa, 0xbb, 0xcc]);
    expect(rgbToHex([300, -5, 16])).toBe('#ff0010');
    expect(hexToRgb('nope')).toEqual([128, 128, 128]);
  });
  it('mixing', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#102030', '#102030', 0.3)).toBe('#102030');
  });
  it('the hash is stable', () => {
    expect(hash('developer')).toBe(hash('developer'));
    expect(hash('developer')).not.toBe(hash('marketing'));
  });
});
