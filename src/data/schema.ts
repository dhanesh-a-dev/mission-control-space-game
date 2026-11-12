/**
 * THE DATA CONTRACT
 * -----------------
 * Every piece of game content (parts, rockets, orbits, missions, random events)
 * must match these shapes. The game never hard-codes a part: it reads them all
 * from a catalog JSON file that is checked against this schema.
 *
 * If NASA gives us new data at the event, we convert it INTO this shape
 * (see docs/PLUG_IN_NEW_DATA.md) and the rest of the app keeps working.
 */
import { z } from 'zod';

export const CATEGORIES = ['bus', 'solar', 'battery', 'comms', 'computer', 'adcs'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, { label: string; help: string }> = {
  bus: { label: 'Spacecraft bus', help: 'The body/frame. Bigger buses fit more instruments but weigh and cost more.' },
  solar: { label: 'Solar panels', help: 'Turn sunlight into electricity. Only work while in sunlight.' },
  battery: { label: 'Battery', help: 'Stores energy so the spacecraft survives when Earth or Mars blocks the Sun (eclipse).' },
  comms: { label: 'Radio (comms)', help: 'Sends your science data down to antennas on Earth.' },
  computer: { label: 'Onboard computer', help: 'Runs the spacecraft and stores data until it can be sent home.' },
  adcs: { label: 'Attitude control', help: 'Points the spacecraft. Cameras need precise pointing to take sharp pictures.' },
};

const sourced = {
  source: z.string().min(1, 'Every item needs a source (where the number came from).'),
  note: z.string().default(''),
};

export const ComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(CATEGORIES),
  description: z.string().min(1),
  massKg: z.number().nonnegative(),
  powerW: z.number().nonnegative(), // power it CONSUMES
  costM: z.number().nonnegative(), // cost in millions of US dollars
  lifeYears: z.number().positive(),
  powerGenW: z.number().nonnegative().optional(), // solar: power generated in full sunlight near Earth
  batteryWh: z.number().positive().optional(), // battery: energy stored
  batteryCycles: z.number().positive().optional(), // battery: charge/discharge cycles before it wears out
  downlinkGBPerDay: z.number().nonnegative().optional(), // comms: data sent per day from a typical low Earth orbit
  storageGB: z.number().positive().optional(), // computer: onboard storage
  dataCompression: z.number().positive().max(1).optional(), // computer: 0.5 = halves the data
  pointing: z.number().int().min(1).max(3).optional(), // adcs: 1 rough, 2 good, 3 precise
  instrumentSlots: z.number().int().min(0).max(3).optional(), // bus: how many instruments fit
  ...sourced,
});

export const InstrumentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1), // e.g. camera, thermal, radar, particle, magnetic, solar, spectral
  description: z.string().min(1),
  massKg: z.number().nonnegative(),
  powerW: z.number().nonnegative(),
  costM: z.number().nonnegative(),
  dataGBPerDay: z.number().nonnegative(),
  science: z.number().nonnegative(),
  minPointing: z.number().int().min(1).max(3),
  ...sourced,
});

export const OrbitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  altitudeLabel: z.string(),
  sunlightFraction: z.number().min(0).max(1), // share of time in sunlight
  solarFactor: z.number().positive(), // sunlight strength vs. Earth (Mars ≈ 0.43)
  eclipseMinutes: z.number().nonnegative(), // longest shadow period per orbit
  orbitsPerDay: z.number().nonnegative(), // how many eclipses (battery cycles) per day
  contactFactor: z.number().nonnegative(), // downlink multiplier (far away = smaller)
  maxLifeYears: z.number().positive(), // e.g. very low orbits decay quickly
  opsCostPerYearM: z.number().nonnegative(),
  transferMonths: z.number().nonnegative(), // cruise time to get there
  ...sourced,
});

export const LaunchVehicleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  costM: z.number().nonnegative(),
  capacityKg: z.record(z.string(), z.number().nonnegative()), // orbitId -> kg it can carry there
  ...sourced,
});

export const ObjectiveSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().default('🛰️'),
  difficulty: z.string().default('Medium'), // shown on the mission card
  requiredInstrumentTypes: z.array(z.string()).min(1), // need AT LEAST ONE of these types
  allowedOrbits: z.array(z.string()).min(1),
  orbitFit: z.record(z.string(), z.number().nonnegative()), // science multiplier per orbit
  budgetCapM: z.number().positive(),
  minLifeYears: z.number().positive(),
  minScience: z.number().nonnegative(),
  ...sourced,
});

export const EventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum(['power', 'solar', 'downlink', 'budget', 'battery']),
  amount: z.number().nonnegative(), // fraction lost (0.25 = 25%) or days for downlink outages
  ...sourced,
});

export const CatalogSchema = z.object({
  version: z.string(),
  title: z.string().default('Mission catalog'),
  components: z.array(ComponentSchema).min(1),
  instruments: z.array(InstrumentSchema).min(1),
  orbits: z.array(OrbitSchema).min(1),
  launchVehicles: z.array(LaunchVehicleSchema).min(1),
  objectives: z.array(ObjectiveSchema).min(1),
  events: z.array(EventSchema).default([]),
});

export type Component = z.infer<typeof ComponentSchema>;
export type Instrument = z.infer<typeof InstrumentSchema>;
export type Orbit = z.infer<typeof OrbitSchema>;
export type LaunchVehicle = z.infer<typeof LaunchVehicleSchema>;
export type Objective = z.infer<typeof ObjectiveSchema>;
export type MissionEvent = z.infer<typeof EventSchema>;
export type Catalog = z.infer<typeof CatalogSchema>;

export type ValidationResult = { ok: true; catalog: Catalog } | { ok: false; errors: string[] };

/** Category-specific fields each component type must have. */
const REQUIRED_FIELDS: Record<Category, (keyof Component)[]> = {
  bus: ['instrumentSlots'],
  solar: ['powerGenW'],
  battery: ['batteryWh', 'batteryCycles'],
  comms: ['downlinkGBPerDay'],
  computer: ['storageGB'],
  adcs: ['pointing'],
};

/**
 * Check any unknown JSON. Returns friendly, human-readable errors.
 * Checks the shape (zod) AND that references between items make sense.
 */
export function validateCatalog(raw: unknown): ValidationResult {
  const parsed = CatalogSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `At "${i.path.join(' → ') || '(root)'}": ${i.message}`),
    };
  }
  const c = parsed.data;
  const errors: string[] = [];
  const orbitIds = new Set(c.orbits.map((o) => o.id));
  const allIds = [...c.components, ...c.instruments, ...c.orbits, ...c.launchVehicles, ...c.objectives].map((x) => x.id);
  const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
  if (dupes.length) errors.push(`Duplicate ids: ${[...new Set(dupes)].join(', ')}`);

  for (const cat of CATEGORIES) {
    const items = c.components.filter((x) => x.category === cat);
    if (!items.length) errors.push(`No components in category "${cat}". The builder needs at least one.`);
    for (const item of items) {
      for (const f of REQUIRED_FIELDS[cat]) {
        if (item[f] === undefined) errors.push(`Component "${item.id}" (${cat}) is missing "${String(f)}".`);
      }
    }
  }
  for (const lv of c.launchVehicles) {
    for (const k of Object.keys(lv.capacityKg)) {
      if (!orbitIds.has(k)) errors.push(`Launch vehicle "${lv.id}" lists unknown orbit "${k}".`);
    }
  }
  const instrumentTypes = new Set(c.instruments.map((i) => i.type));
  for (const ob of c.objectives) {
    for (const o of ob.allowedOrbits) if (!orbitIds.has(o)) errors.push(`Objective "${ob.id}" allows unknown orbit "${o}".`);
    for (const o of Object.keys(ob.orbitFit)) if (!orbitIds.has(o)) errors.push(`Objective "${ob.id}" orbitFit has unknown orbit "${o}".`);
    if (!ob.requiredInstrumentTypes.some((t) => instrumentTypes.has(t)))
      errors.push(`Objective "${ob.id}" needs instrument types [${ob.requiredInstrumentTypes.join(', ')}] but no instrument has them.`);
  }
  return errors.length ? { ok: false, errors } : { ok: true, catalog: c };
}
