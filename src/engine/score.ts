/**
 * score(): 0–100. A successful mission earns points for science and for keeping
 * healthy margins (spare budget, power, mass, data capacity), because real teams
 * value missions that do a lot AND have room for surprises.
 * A failed mission only earns points for how far it got.
 */
import type { Budget } from './budget';

export type ScorePart = { label: string; points: number; max: number; why: string };
export type Score = { total: number; grade: string; parts: ScorePart[] };

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function score(b: Budget, outcome: 'success' | 'failure', progress: number): Score {
  if (outcome === 'failure') {
    const points = Math.round(25 * clamp01(progress));
    return {
      total: points,
      grade: 'Mission lost',
      parts: [{ label: 'Mission progress', points, max: 25, why: `Got ${Math.round(progress * 100)}% of the way through the mission.` }],
    };
  }
  const parts: ScorePart[] = [
    { label: 'Science', max: 40, points: 40 * clamp01(b.science / Math.max(1, b.minScience * 1.6)), why: 'More science than the minimum earns more.' },
    { label: 'Budget reserve', max: 20, points: 20 * clamp01(b.margins.budget / 0.3), why: 'Money left over is a safety net (full points at 30% spare).' },
    { label: 'Power margin', max: 15, points: 15 * clamp01(b.margins.power / 0.3), why: 'Spare power handles surprises (full points at 30%).' },
    { label: 'Mass margin', max: 10, points: 10 * clamp01(b.margins.mass / 0.3), why: 'Spare rocket capacity (full points at 30%).' },
    { label: 'Data headroom', max: 15, points: 15 * clamp01(b.margins.data / 0.5), why: 'Radio capacity beyond your data (full points at 50%).' },
  ].map((p) => ({ ...p, points: Math.round(p.points) }));
  const total = Math.min(100, parts.reduce((a, p) => a + p.points, 0));
  const grade = total >= 85 ? 'Flagship-class' : total >= 70 ? 'Excellent' : total >= 55 ? 'Solid' : 'Scraped through';
  return { total, grade, parts };
}
