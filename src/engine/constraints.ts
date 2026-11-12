/**
 * checkConstraints(): turn the raw numbers into a list of pass / warning / fail checks,
 * each with a plain-English sentence that quotes the real numbers.
 */
import type { Catalog } from '../data/schema';
import { computeBudget, fmt, getInstruments, POWER_MARGIN_REQUIRED, type Budget } from './budget';
import type { Design } from './design';

export type Status = 'ok' | 'warn' | 'fail';
export type ConstraintId =
  | 'slots'
  | 'instrumentType'
  | 'orbitAllowed'
  | 'budget'
  | 'reach'
  | 'mass'
  | 'power'
  | 'battery'
  | 'data'
  | 'science'
  | 'life';

export type Constraint = { id: ConstraintId; label: string; status: Status; margin: number; message: string };

/** Green when there is at least 10% spare, amber when 0–10%, red when broken. */
export function statusFromMargin(m: number, okAt = 0.1): Status {
  if (m >= okAt) return 'ok';
  if (m >= 0) return 'warn';
  return 'fail';
}

export function checkConstraints(design: Design, catalog: Catalog, b: Budget = computeBudget(design, catalog)): Constraint[] {
  const objective = catalog.objectives.find((o) => o.id === design.objectiveId);
  const orbit = catalog.orbits.find((o) => o.id === design.orbitId);
  const launcher = catalog.launchVehicles.find((l) => l.id === design.launcherId);
  const instruments = getInstruments(catalog, design);
  const out: Constraint[] = [];

  // Hard requirements (yes/no)
  const slotsOk = b.instrumentCount <= b.instrumentSlots;
  out.push({
    id: 'slots',
    label: 'Instrument space',
    status: slotsOk ? 'ok' : 'fail',
    margin: slotsOk ? 1 : -1,
    message: slotsOk
      ? `${b.instrumentCount} of ${b.instrumentSlots} instrument slots used.`
      : `You packed ${b.instrumentCount} instruments, but your bus only has room for ${b.instrumentSlots}.`,
  });

  const req = objective?.requiredInstrumentTypes ?? [];
  const hasType = instruments.some((i) => req.includes(i.type));
  out.push({
    id: 'instrumentType',
    label: 'Right instrument',
    status: hasType ? 'ok' : 'fail',
    margin: hasType ? 1 : -1,
    message: hasType
      ? `You carry an instrument that can do this job.`
      : `"${objective?.name}" needs at least one of these instrument types: ${req.join(', ')}. You have none.`,
  });

  const orbitOk = Boolean(orbit && objective?.allowedOrbits.includes(orbit.id));
  out.push({
    id: 'orbitAllowed',
    label: 'Right destination',
    status: orbitOk ? 'ok' : 'fail',
    margin: orbitOk ? 1 : -1,
    message: orbitOk
      ? `${orbit?.name} works for this mission.`
      : `${orbit?.name ?? 'No orbit'} can't do this mission. Allowed: ${objective?.allowedOrbits.map((id) => catalog.orbits.find((o) => o.id === id)?.name ?? id).join(', ')}.`,
  });

  out.push({
    id: 'budget',
    label: 'Budget',
    status: statusFromMargin(b.margins.budget, 0.05),
    margin: b.margins.budget,
    message: `Total cost $${fmt(b.costM)}M (parts $${fmt(b.costBreakdown.partsM)}M + rocket $${fmt(b.costBreakdown.launchM)}M + ${b.requiredLifeYears} yr operations $${fmt(b.costBreakdown.opsM)}M) vs. cap $${fmt(b.budgetCapM)}M.`,
  });

  const reaches = b.capacityKg > 0;
  out.push({
    id: 'reach',
    label: 'Rocket reaches orbit',
    status: reaches ? 'ok' : 'fail',
    margin: reaches ? 1 : -1,
    message: reaches
      ? `${launcher?.name} can reach ${orbit?.name}.`
      : `${launcher?.name ?? 'No rocket'} can't take anything to ${orbit?.name ?? 'that orbit'}.`,
  });

  out.push({
    id: 'mass',
    label: 'Mass',
    status: reaches ? statusFromMargin(b.margins.mass) : 'fail',
    margin: b.margins.mass,
    message: `Spacecraft ${fmt(b.massKg)} kg vs. rocket capacity ${fmt(b.capacityKg)} kg to this orbit.`,
  });

  out.push({
    id: 'power',
    label: 'Power',
    status: statusFromMargin(b.margins.power, POWER_MARGIN_REQUIRED),
    margin: b.margins.power,
    message: `Panels give ${fmt(b.powerGenW)} W on average (after time in shadow${orbit && orbit.solarFactor < 1 ? ' and weaker sunlight' : ''}); spacecraft uses ${fmt(b.powerUseW)} W.`,
  });

  out.push({
    id: 'battery',
    label: 'Battery',
    status: statusFromMargin(b.margins.battery),
    margin: b.margins.battery,
    message:
      b.batteryNeedWh === 0
        ? `No eclipses here, so the battery has an easy life.`
        : `A ${orbit?.eclipseMinutes}-min eclipse needs ${fmt(b.batteryNeedWh)} Wh; your battery can safely give ${fmt(b.batteryUsableWh)} Wh.`,
  });

  out.push({
    id: 'data',
    label: 'Data',
    status: statusFromMargin(b.margins.data),
    margin: b.margins.data,
    message: `Instruments make ${fmt(b.dataGBPerDay, 2)} GB/day; your radio can send ${fmt(b.downlinkGBPerDay, 2)} GB/day from this orbit.`,
  });

  out.push({
    id: 'science',
    label: 'Science',
    status: statusFromMargin(b.margins.science),
    margin: b.margins.science,
    message:
      `Science score ${fmt(b.science)} vs. ${fmt(b.minScience)} needed.` +
      (b.lowPointingInstruments.length
        ? ` ${b.lowPointingInstruments.map((i) => i.name).join(', ')} ${b.lowPointingInstruments.length === 1 ? 'gets' : 'get'} half value: pointing is too rough.`
        : ''),
  });

  out.push({
    id: 'life',
    label: 'Lifetime',
    status: statusFromMargin(b.margins.life),
    margin: b.margins.life,
    message: `Expected life ${fmt(b.lifeYears)} yr (limited by ${b.lifeLimit.reason}) vs. ${b.requiredLifeYears} yr required.`,
  });

  return out;
}
