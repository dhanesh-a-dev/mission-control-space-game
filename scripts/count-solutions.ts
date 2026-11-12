/**
 * Balance check: how many designs win each objective (no random events)?
 * Proves "there is no single right answer". Usage: npx tsx scripts/count-solutions.ts
 */
import { readFileSync } from 'node:fs';
import { validateCatalog, CATEGORIES } from '../src/data/schema';
import { simulateMission, computeBudget, checkConstraints, type Design } from '../src/engine';

const r = validateCatalog(JSON.parse(readFileSync(process.argv[2] ?? 'public/data/catalog.json', 'utf8')));
if (!r.ok) throw new Error(r.errors.join('\n'));
const cat = r.catalog;

const byCat = CATEGORIES.map((c) => cat.components.filter((x) => x.category === c));
const ids = cat.instruments.map((i) => i.id);
const subsets: string[][] = [];
for (let mask = 1; mask < 1 << ids.length; mask++) {
  const s = ids.filter((_, i) => mask & (1 << i));
  if (s.length <= 3) subsets.push(s);
}

for (const ob of cat.objectives) {
  let wins = 0;
  let total = 0;
  let best: { score: number; design: Design } | null = null;
  const rec = (i: number, parts: Design['parts']) => {
    if (i < CATEGORIES.length) {
      for (const c of byCat[i]) rec(i + 1, { ...parts, [CATEGORIES[i]]: c.id });
      return;
    }
    for (const orbitId of ob.allowedOrbits)
      for (const lv of cat.launchVehicles)
        for (const inst of subsets) {
          total++;
          const d: Design = { objectiveId: ob.id, parts, instrumentIds: inst, launcherId: lv.id, orbitId };
          const b = computeBudget(d, cat);
          if (checkConstraints(d, cat, b).some((c) => c.status === 'fail')) continue;
          const sim = simulateMission(d, cat);
          if (sim.outcome === 'success') {
            wins++;
            if (!best || sim.score.total > best.score) best = { score: sim.score.total, design: d };
          }
        }
  };
  rec(0, {});
  console.log(`${ob.name}: ${wins} winning designs out of ${total.toLocaleString()} (${((wins / total) * 100).toFixed(3)}%). Best score ${best?.score}`);
  if (best) console.log('  best:', JSON.stringify(best.design));
}
