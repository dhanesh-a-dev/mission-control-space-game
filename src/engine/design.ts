import { CATEGORIES, type Catalog, type Category } from '../data/schema';

/** A player's mission design: just ids pointing into the catalog. */
export type Design = {
  objectiveId: string;
  parts: Partial<Record<Category, string>>;
  instrumentIds: string[];
  launcherId?: string;
  orbitId?: string;
};

/**
 * A cheap starting design: the cheapest option in every category and the first allowed orbit.
 * It is deliberately NOT a winning design: the player has to improve it.
 */
export function starterDesign(catalog: Catalog, objectiveId: string): Design {
  const objective = catalog.objectives.find((o) => o.id === objectiveId) ?? catalog.objectives[0];
  const parts: Design['parts'] = {};
  for (const cat of CATEGORIES) {
    const cheapest = catalog.components.filter((c) => c.category === cat).sort((a, b) => a.costM - b.costM)[0];
    if (cheapest) parts[cat] = cheapest.id;
  }
  const orbitId = objective.allowedOrbits[0];
  const launcher =
    catalog.launchVehicles
      .filter((l) => (l.capacityKg[orbitId] ?? 0) > 0)
      .sort((a, b) => a.costM - b.costM)[0] ?? catalog.launchVehicles[0];
  return { objectiveId: objective.id, parts, instrumentIds: [], launcherId: launcher.id, orbitId };
}
