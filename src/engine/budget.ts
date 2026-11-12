/**
 * computeBudget(): add up everything about a design.
 * Pure function: same design + same catalog always gives the same numbers.
 *
 * The simple formulas (also explained in-game):
 *  - Mass      = sum of all parts. Must fit the rocket's capacity for that orbit.
 *  - Power     = panel power × time in sunlight × sunlight strength. Must beat use by 10%.
 *  - Battery   = half the battery (we never drain it fully) must cover one eclipse.
 *  - Data      = what instruments make per day (after compression) must be ≤ what
 *                the radio can send per day from that orbit.
 *  - Budget    = parts + rocket + operations per year × required years ≤ cap.
 *  - Lifetime  = the weakest link: orbit decay, worn-out battery, or the shortest-lived part.
 *  - Science   = sum of instrument science × how well the orbit fits the objective
 *                (halved for an instrument if pointing is too rough).
 */
import { CATEGORIES, type Catalog, type Category, type Component, type Instrument } from '../data/schema';
import type { Design } from './design';

export const POWER_MARGIN_REQUIRED = 0.1; // engineers want 10% spare power
export const BATTERY_USABLE_FRACTION = 0.5; // only drain batteries halfway to keep them healthy
export const SOLAR_DEGRADATION_PER_YEAR = 0.03; // panels lose ~3% per year

export type LifeLimit = { years: number; reason: string };

export type Budget = {
  massKg: number;
  capacityKg: number;
  powerUseW: number;
  powerGenW: number; // orbit-average generation at the start of the mission
  batteryNeedWh: number;
  batteryUsableWh: number;
  dataGBPerDay: number; // after compression
  downlinkGBPerDay: number; // from the chosen orbit
  storageGB: number;
  costM: number;
  costBreakdown: { partsM: number; launchM: number; opsM: number };
  budgetCapM: number;
  lifeYears: number;
  lifeLimit: LifeLimit;
  requiredLifeYears: number;
  science: number;
  minScience: number;
  instrumentSlots: number;
  instrumentCount: number;
  pointing: number;
  lowPointingInstruments: Instrument[];
  margins: {
    mass: number;
    power: number;
    battery: number;
    data: number;
    budget: number;
    life: number;
    science: number;
  };
};

export function getPart(catalog: Catalog, design: Design, cat: Category): Component | undefined {
  const id = design.parts[cat];
  return catalog.components.find((c) => c.id === id && c.category === cat);
}

export function getInstruments(catalog: Catalog, design: Design): Instrument[] {
  return design.instrumentIds
    .map((id) => catalog.instruments.find((i) => i.id === id))
    .filter((i): i is Instrument => Boolean(i));
}

/** (have - need) / need, safe when need is 0. */
function margin(have: number, need: number): number {
  if (need <= 0) return have >= 0 ? 1 : -1;
  return (have - need) / need;
}

export function computeBudget(design: Design, catalog: Catalog): Budget {
  const parts = CATEGORIES.map((c) => getPart(catalog, design, c)).filter((p): p is Component => Boolean(p));
  const instruments = getInstruments(catalog, design);
  const orbit = catalog.orbits.find((o) => o.id === design.orbitId);
  const launcher = catalog.launchVehicles.find((l) => l.id === design.launcherId);
  const objective = catalog.objectives.find((o) => o.id === design.objectiveId);
  const bus = getPart(catalog, design, 'bus');
  const solar = getPart(catalog, design, 'solar');
  const battery = getPart(catalog, design, 'battery');
  const comms = getPart(catalog, design, 'comms');
  const computer = getPart(catalog, design, 'computer');
  const adcs = getPart(catalog, design, 'adcs');

  // MASS
  const massKg = sum(parts, (p) => p.massKg) + sum(instruments, (i) => i.massKg);
  const capacityKg = orbit && launcher ? (launcher.capacityKg[orbit.id] ?? 0) : 0;

  // POWER
  const powerUseW = sum(parts, (p) => p.powerW) + sum(instruments, (i) => i.powerW);
  const powerGenW = (solar?.powerGenW ?? 0) * (orbit?.sunlightFraction ?? 0) * (orbit?.solarFactor ?? 0);

  // BATTERY: energy needed to get through the longest eclipse
  const batteryNeedWh = powerUseW * ((orbit?.eclipseMinutes ?? 0) / 60);
  const batteryUsableWh = (battery?.batteryWh ?? 0) * BATTERY_USABLE_FRACTION;

  // DATA
  const compression = computer?.dataCompression ?? 1;
  const dataGBPerDay = sum(instruments, (i) => i.dataGBPerDay) * compression;
  const downlinkGBPerDay = (comms?.downlinkGBPerDay ?? 0) * (orbit?.contactFactor ?? 0);
  const storageGB = computer?.storageGB ?? 0;

  // BUDGET
  const requiredLifeYears = objective?.minLifeYears ?? 1;
  const partsM = sum(parts, (p) => p.costM) + sum(instruments, (i) => i.costM);
  const launchM = launcher?.costM ?? 0;
  const opsM = (orbit?.opsCostPerYearM ?? 0) * requiredLifeYears;
  const costM = partsM + launchM + opsM;
  const budgetCapM = objective?.budgetCapM ?? 0;

  // LIFETIME: the weakest link wins
  const limits: LifeLimit[] = [];
  if (orbit) limits.push({ years: orbit.maxLifeYears, reason: `the ${orbit.name} itself (orbit life ${fmt(orbit.maxLifeYears)} yr)` });
  for (const p of parts) limits.push({ years: p.lifeYears, reason: `the ${p.name} (rated ${fmt(p.lifeYears)} yr)` });
  if (battery?.batteryCycles && orbit && orbit.orbitsPerDay > 0) {
    const years = battery.batteryCycles / (orbit.orbitsPerDay * 365);
    limits.push({
      years,
      reason: `the ${battery.name} wearing out (${battery.batteryCycles.toLocaleString()} charge cycles at ${orbit.orbitsPerDay} eclipses/day ≈ ${fmt(years)} yr)`,
    });
  }
  const lifeLimit = limits.reduce<LifeLimit>((a, b) => (b.years < a.years ? b : a), { years: 99, reason: 'nothing' });
  const lifeYears = lifeLimit.years;

  // SCIENCE
  const pointing = adcs?.pointing ?? 0;
  const fit = (orbit && objective?.orbitFit[orbit.id]) ?? 0;
  const lowPointingInstruments = instruments.filter((i) => i.minPointing > pointing);
  const science = sum(instruments, (i) => i.science * (i.minPointing > pointing ? 0.5 : 1)) * fit;
  const minScience = objective?.minScience ?? 0;

  return {
    massKg,
    capacityKg,
    powerUseW,
    powerGenW,
    batteryNeedWh,
    batteryUsableWh,
    dataGBPerDay,
    downlinkGBPerDay,
    storageGB,
    costM,
    costBreakdown: { partsM, launchM, opsM },
    budgetCapM,
    lifeYears,
    lifeLimit,
    requiredLifeYears,
    science,
    minScience,
    instrumentSlots: bus?.instrumentSlots ?? 0,
    instrumentCount: instruments.length,
    pointing,
    lowPointingInstruments,
    margins: {
      mass: capacityKg > 0 ? (capacityKg - massKg) / capacityKg : -1,
      power: margin(powerGenW, powerUseW),
      battery: margin(batteryUsableWh, batteryNeedWh),
      data: dataGBPerDay <= 0 ? 1 : downlinkGBPerDay <= 0 ? -1 : (downlinkGBPerDay - dataGBPerDay) / downlinkGBPerDay,
      budget: budgetCapM > 0 ? (budgetCapM - costM) / budgetCapM : -1,
      life: margin(lifeYears, requiredLifeYears),
      science: margin(science, minScience),
    },
  };
}

function sum<T>(arr: T[], f: (x: T) => number): number {
  return arr.reduce((a, x) => a + f(x), 0);
}

export function fmt(n: number, digits = 1): string {
  if (!isFinite(n)) return '∞';
  if (Math.abs(n) >= 100) return Math.round(n).toLocaleString('en-US');
  if (n !== 0 && Math.abs(n) < 0.1) return Number(n.toPrecision(2)).toString(); // keep tiny numbers visible
  return Number(n.toFixed(digits)).toString();
}
