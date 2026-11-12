/**
 * Turn a design into "what the spacecraft looks like".
 * Everything is derived from the catalog NUMBERS (mass, watts, GB/day, type),
 * never from specific part names, so new data automatically gets a sensible look.
 */
import type { Catalog, Orbit } from '../../data/schema';
import { getInstruments, getPart, type Design } from '../../engine';

export type InstrumentVisual = { id: string; color: string; size: number };

export type SpacecraftVisual = {
  bodyW: number; // body width/depth
  bodyH: number; // body height
  bodyCells: boolean; // solar cells glued on the body (no wings)
  panelsPerWing: number; // 0 = no wings
  antenna: 'whip' | 'patch' | 'dish';
  dishRadius: number;
  starTracker: boolean;
  instruments: InstrumentVisual[];
};

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** Same type string → same color, for any instrument type in any dataset. */
export function colorForType(type: string): string {
  let h = 0;
  for (const ch of type) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 75%, 60%)`;
}

export function spacecraftVisual(design: Design, catalog: Catalog): SpacecraftVisual {
  const bus = getPart(catalog, design, 'bus');
  const solar = getPart(catalog, design, 'solar');
  const comms = getPart(catalog, design, 'comms');
  const adcs = getPart(catalog, design, 'adcs');
  const mass = bus?.massKg ?? 4;
  const side = clamp(0.32 * Math.cbrt(mass), 0.45, 1.25);
  const gen = solar?.powerGenW ?? 0;
  const down = comms?.downlinkGBPerDay ?? 0;
  return {
    bodyW: side,
    bodyH: side * (mass < 6 ? 1.9 : 1.35), // small CubeSats are tall and thin
    bodyCells: gen > 0 && gen < 20,
    panelsPerWing: gen < 20 ? 0 : clamp(Math.round(Math.log2(gen / 10)), 1, 5),
    antenna: down < 0.5 ? 'whip' : down < 5 ? 'patch' : 'dish',
    dishRadius: clamp(0.18 + 0.12 * Math.log10(down + 1), 0.18, 0.45),
    starTracker: (adcs?.pointing ?? 0) >= 3,
    instruments: getInstruments(catalog, design).map((i) => ({
      id: i.id,
      color: colorForType(i.type),
      size: clamp(0.14 * Math.cbrt(i.massKg) + 0.06, 0.1, 0.4),
    })),
  };
}

export type SceneKind = 'earth' | 'mars' | 'deep';

/** Pick a backdrop from orbit numbers: weak sunlight = Mars-like, no eclipses at all = deep space (L1). */
export function sceneFor(orbit: Orbit | undefined): { kind: SceneKind; radius: number; speed: number } {
  if (!orbit) return { kind: 'earth', radius: 2.4, speed: 0.4 };
  if (orbit.orbitsPerDay === 0) return { kind: 'deep', radius: 0, speed: 0 };
  return {
    kind: orbit.solarFactor < 0.8 ? 'mars' : 'earth',
    radius: clamp(1.75 + 1.6 / Math.sqrt(orbit.orbitsPerDay), 2.1, 3.6), // fewer orbits/day = higher orbit
    speed: clamp(0.12 * Math.sqrt(orbit.orbitsPerDay), 0.06, 0.6),
  };
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
