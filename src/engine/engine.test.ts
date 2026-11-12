import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateCatalog, type Catalog } from '../data/schema';
import { computeBudget, simulateMission, starterDesign, suggestFixes, type Design } from './index';

const raw = JSON.parse(readFileSync('src/data/sample/catalog.json', 'utf8'));
const res = validateCatalog(raw);
if (!res.ok) throw new Error(res.errors.join('\n'));
const catalog: Catalog = res.catalog;

const goodEarth: Design = {
  objectiveId: 'earth-watcher',
  parts: { bus: 'bus-6u', solar: 'solar-large', battery: 'battery-100', comms: 'comms-xband', computer: 'computer-standard', adcs: 'adcs-wheels' },
  instrumentIds: ['inst-thermal', 'inst-camera'],
  launcherId: 'lv-rideshare',
  orbitId: 'leo-sso',
};
const swap = (d: Design, cat: keyof Design['parts'], id: string): Design => ({ ...d, parts: { ...d.parts, [cat]: id } });

describe('data validation', () => {
  it('accepts the sample catalog', () => expect(res.ok).toBe(true));
  it('rejects a broken catalog with friendly errors', () => {
    const bad = validateCatalog({ version: 'x', components: [], instruments: [], orbits: [], launchVehicles: [], objectives: [] });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.length).toBeGreaterThan(0);
  });
});

describe('budget math', () => {
  it('adds up mass from every part and instrument', () => {
    const b = computeBudget(goodEarth, catalog);
    expect(b.massKg).toBeCloseTo(8 + 3 + 0.8 + 0.6 + 0.2 + 0.8 + 2 + 1, 5);
    expect(b.capacityKg).toBe(30);
  });
  it('reduces solar power by time in shadow', () => {
    const b = computeBudget(goodEarth, catalog);
    expect(b.powerGenW).toBeCloseTo(120 * 0.62, 5);
  });
});

describe('Fly the Mission', () => {
  it('a good design succeeds with a score', () => {
    const r = simulateMission(goodEarth, catalog);
    expect(r.outcome).toBe('success');
    expect(r.score.total).toBeGreaterThan(50);
    expect(r.steps.at(-1)?.title).toMatch(/accomplished/i);
  });

  it('overweight design is scrubbed at launch', () => {
    const r = simulateMission(swap(goodEarth, 'bus', 'bus-espa'), catalog);
    // ESPA bus is too expensive here, so it fails at review first; use a bigger budget objective to isolate mass
    expect(r.outcome).toBe('failure');
    const heavy = simulateMission({ ...goodEarth, parts: { ...goodEarth.parts, bus: 'bus-12u', solar: 'solar-array' } }, catalog);
    expect(heavy.outcome).toBe('failure');
    expect(heavy.failure?.constraintId).toBe('mass');
    expect(heavy.failure?.why).toMatch(/kg/);
  });

  it('power deficit fails on day 1', () => {
    const r = simulateMission(swap(goodEarth, 'solar', 'solar-body'), catalog);
    expect(r.failure?.constraintId).toBe('power');
    expect(r.steps.at(-1)?.when).toBe('Day 1');
  });

  it('data overflow fails on the day storage fills', () => {
    const r = simulateMission(swap(goodEarth, 'comms', 'comms-sband'), catalog);
    expect(r.failure?.constraintId).toBe('data');
    // 6 GB/day made, 1.5 sent, 32 GB storage -> full on day 7
    expect(r.steps.at(-1)?.when).toBe('Day 7');
  });

  it('budget overrun is cancelled at design review', () => {
    const r = simulateMission({ ...goodEarth, launcherId: 'lv-medium' }, catalog);
    expect(r.failure?.constraintId).toBe('budget');
    expect(r.steps).toHaveLength(1);
  });

  it('very low orbit decays before the 2-year mission ends', () => {
    const r = simulateMission({ ...goodEarth, orbitId: 'vleo' }, catalog);
    expect(r.failure?.constraintId).toBe('life');
  });

  it('every failure comes with concrete fixes, and the first fix works', () => {
    for (const d of [swap(goodEarth, 'solar', 'solar-body'), swap(goodEarth, 'comms', 'comms-sband'), { ...goodEarth, orbitId: 'vleo' }]) {
      const r = simulateMission(d, catalog);
      expect(r.failure?.fixes.length).toBeGreaterThan(0);
      const fix = suggestFixes(d, catalog, r.failure!.constraintId!)[0];
      const again = simulateMission(fix.design, catalog);
      expect(again.failure?.constraintId).not.toBe(r.failure?.constraintId);
    }
  });

  it('the starter design is valid but needs work', () => {
    for (const ob of catalog.objectives) {
      const r = simulateMission(starterDesign(catalog, ob.id), catalog);
      expect(r.outcome).toBe('failure');
    }
  });

  it('random events are repeatable with the same seed', () => {
    const a = simulateMission(goodEarth, catalog, { events: true, seed: 42 });
    const b = simulateMission(goodEarth, catalog, { events: true, seed: 42 });
    expect(a.events.map((e) => e.id)).toEqual(b.events.map((e) => e.id));
    expect(a.steps.map((s) => s.title)).toEqual(b.steps.map((s) => s.title));
    expect(a.events).toHaveLength(2);
  });
});
