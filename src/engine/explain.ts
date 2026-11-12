/**
 * suggestFixes(): find the smallest single changes that fix a broken check.
 *
 * How it works (no hard-coded advice!): we try every single swap the player
 * could make (each part, each rocket, each allowed orbit, adding or removing one
 * instrument), re-run the rules, and keep the changes that fix the problem
 * WITHOUT breaking anything else. Cheapest changes first.
 * This means the advice stays correct even when the catalog data changes.
 */
import { CATEGORIES, CATEGORY_LABELS, type Catalog } from '../data/schema';
import { computeBudget, fmt, type Budget } from './budget';
import { checkConstraints, type ConstraintId } from './constraints';
import type { Design } from './design';

export type Fix = { text: string; design: Design; costDeltaM: number; sideEffects: string[] };

function candidates(design: Design, catalog: Catalog): { text: string; design: Design }[] {
  const out: { text: string; design: Design }[] = [];
  for (const cat of CATEGORIES) {
    for (const c of catalog.components.filter((x) => x.category === cat && x.id !== design.parts[cat])) {
      out.push({
        text: `Swap the ${CATEGORY_LABELS[cat].label.toLowerCase()} for "${c.name}"`,
        design: { ...design, parts: { ...design.parts, [cat]: c.id } },
      });
    }
  }
  for (const lv of catalog.launchVehicles.filter((l) => l.id !== design.launcherId)) {
    out.push({ text: `Fly on "${lv.name}"`, design: { ...design, launcherId: lv.id } });
  }
  const objective = catalog.objectives.find((o) => o.id === design.objectiveId);
  for (const oid of objective?.allowedOrbits ?? []) {
    if (oid === design.orbitId) continue;
    const orbit = catalog.orbits.find((o) => o.id === oid);
    if (!orbit) continue;
    // moving orbit usually needs a rocket that can reach it: try each rocket too
    for (const lv of catalog.launchVehicles) {
      const sameRocket = lv.id === design.launcherId;
      out.push({
        text: sameRocket ? `Move to "${orbit.name}"` : `Move to "${orbit.name}" on "${lv.name}"`,
        design: { ...design, orbitId: oid, launcherId: lv.id },
      });
    }
  }
  for (const id of design.instrumentIds) {
    const inst = catalog.instruments.find((i) => i.id === id);
    out.push({ text: `Remove "${inst?.name}"`, design: { ...design, instrumentIds: design.instrumentIds.filter((x) => x !== id) } });
  }
  for (const inst of catalog.instruments.filter((i) => !design.instrumentIds.includes(i.id))) {
    out.push({ text: `Add "${inst.name}"`, design: { ...design, instrumentIds: [...design.instrumentIds, inst.id] } });
  }
  return out;
}

/** A target is either a check id ("fix the power check") or a custom test on the new numbers. */
export type FixTarget = ConstraintId | ((b: Budget) => boolean);

export function suggestFixes(design: Design, catalog: Catalog, target: FixTarget, max = 2): Fix[] {
  const base = computeBudget(design, catalog);
  const baseFails = new Set(checkConstraints(design, catalog, base).filter((c) => c.status === 'fail').map((c) => c.id));
  const clean: Fix[] = [];
  const messy: Fix[] = [];
  for (const cand of candidates(design, catalog)) {
    const b = computeBudget(cand.design, catalog);
    const checks = checkConstraints(cand.design, catalog, b);
    if (typeof target === 'function') {
      if (!target(b)) continue;
    } else {
      const t = checks.find((c) => c.id === target);
      if (!t || t.status === 'fail') continue;
    }
    const newFails = checks.filter((c) => c.status === 'fail' && !baseFails.has(c.id)).map((c) => c.label.toLowerCase());
    const fix: Fix = { text: cand.text, design: cand.design, costDeltaM: b.costM - base.costM, sideEffects: newFails };
    (newFails.length === 0 ? clean : messy).push(fix);
  }
  // cheapest clean fixes first; then fixes with the fewest side effects
  const byCost = (a: Fix, b: Fix) => a.costDeltaM - b.costDeltaM;
  clean.sort(byCost);
  messy.sort((a, b) => a.sideEffects.length - b.sideEffects.length || byCost(a, b));
  return [...clean, ...messy].slice(0, max);
}

/** A rule of thumb for each kind of problem: shown even when no single swap fixes it. */
export const RULES_OF_THUMB: Record<ConstraintId, string> = {
  slots: 'Each bus has a fixed number of instrument slots. Bigger bus = more room, but more mass and cost.',
  instrumentType: 'Start from the goal: pick the instrument that can actually observe what the mission is about.',
  orbitAllowed: 'The destination comes from the science goal. You cannot study Mars from Earth orbit!',
  budget: 'The rocket is often the biggest bill. A rideshare is cheap if your spacecraft is small enough.',
  reach: 'Not every rocket goes everywhere. Far destinations need rockets built for them.',
  mass: 'Every kilogram must be lifted. Lighter parts, or a bigger (pricier) rocket.',
  power: 'Power = panel size × time in sunlight × sunlight strength. Far from the Sun, you need much bigger panels.',
  battery: 'The battery must keep everything running through each shadow. Longer eclipses or hungrier parts need a bigger battery.',
  data: 'Make less data (fewer instruments, onboard processing) or send more (a faster radio, an orbit closer to Earth). Far away, you often need both.',
  science: 'Science = instrument value × how well the orbit suits the goal. Precise pointing keeps cameras at full value.',
  life: 'A mission only lasts as long as its weakest part. Check the orbit, the battery cycles and each part’s rated life.',
};

export function describeFix(f: Fix): string {
  const cost = Math.abs(f.costDeltaM) < 0.005 ? '' : ` (${f.costDeltaM > 0 ? '+' : '−'}$${fmt(Math.abs(f.costDeltaM), 2)}M)`;
  const side = f.sideEffects.length ? `, but watch out: this breaks ${f.sideEffects.join(' and ')}` : '';
  return `${f.text}${cost}${side}.`;
}
