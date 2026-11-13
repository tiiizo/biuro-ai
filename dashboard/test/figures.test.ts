import { describe, expect, it } from 'vitest';
import { cycleTime, ROLE_COLORS, motionPlan, agentRole, figureState, figureLook } from '../src/figures';
import { parseOffice } from '../src/parse';
import sample from './fixtures/office.md?raw';

describe('role and outfit color', () => {
  it.each([
    ['developer', 'developer'],
    ['developer-web', 'developer'],
    ['developer-api', 'developer'],
    ['product-owner', 'product-owner'],
    ['office-manager', 'office-manager'],
    ['marketing', 'marketing'],
    ['reviewer', 'reviewer'],
    ['Director', 'director'],
  ])('%s → %s', (agent, role) => {
    expect(agentRole(agent)).toBe(role);
    expect(figureLook(agent).outfit).toBe(ROLE_COLORS[role]);
  });

  it('roles have different colors', () => {
    const colors = Object.values(ROLE_COLORS);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('an unknown role gets a fixed color (deterministic)', () => {
    const a = figureLook('someone-new');
    expect(a.outfit).toMatch(/^#[0-9a-f]{6}$/);
    expect(figureLook('someone-new')).toEqual(a);
  });

  it('every agent in office.md has a look', () => {
    const r = parseOffice(sample);
    if (!r.ok) throw new Error('office.md does not validate');
    const agents = r.office.floors.flatMap((f) => f.rooms.flatMap((x) => x.agents));
    expect(agents.length).toBeGreaterThan(0);
    for (const a of agents) expect(ROLE_COLORS[agentRole(a)], a).toBeDefined();
  });
});

describe('animation: sits → walks to the board → stands → walks back', () => {
  const chair = { x: 3.5, z: 1.35 };
  const target = { x: 0.5, z: 1.5 };
  const plan = motionPlan('developer', chair, 2.5, target);
  const cycle = cycleTime(plan);
  const samples = Array.from({ length: 400 }, (_, i) => (i / 400) * cycle - plan.phase);

  it('is periodic', () => {
    for (const t of samples.slice(0, 50)) expect(figureState(plan, t + cycle)).toEqual(figureState(plan, t));
  });

  it('has all poses, sits at the chair and stands at the target', () => {
    const states = samples.map((t) => figureState(plan, t));
    expect(new Set(states.map((s) => s.pose))).toEqual(new Set(['sitting', 'walking', 'standing']));
    for (const s of states.filter((x) => x.pose === 'sitting')) expect({ x: s.x, z: s.z }).toEqual(chair);
    for (const s of states.filter((x) => x.pose === 'standing')) expect({ x: s.x, z: s.z }).toEqual(target);
  });

  it('walks only along the route: chair column, aisle, target column', () => {
    for (const t of samples) {
      const s = figureState(plan, t);
      if (s.pose !== 'walking') continue;
      const onChairColumn = Math.abs(s.x - chair.x) < 1e-9;
      const inAisle = Math.abs(s.z - 2.5) < 1e-9;
      const onTargetColumn = Math.abs(s.x - target.x) < 1e-9;
      expect(onChairColumn || inAisle || onTargetColumn).toBe(true);
      expect(s.x).toBeGreaterThanOrEqual(target.x);
      expect(s.x).toBeLessThanOrEqual(chair.x);
    }
  });

  it('different agents have different phases (they do not walk in step)', () => {
    const phases = new Set(['developer', 'marketing', 'product-owner', 'director', 'reviewer'].map((n) => motionPlan(n, chair, 2.5, target).phase));
    expect(phases.size).toBeGreaterThan(1);
  });
});
