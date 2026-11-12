/**
 * Check any catalog JSON file against the game schema.
 * Usage:  npm run validate-data                 (checks public/data/catalog.json)
 *         npm run validate-data -- path/to/file.json
 */
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../src/data/schema';

const file = process.argv[2] ?? 'public/data/catalog.json';
let raw: unknown;
try {
  raw = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`✗ Could not read "${file}" as JSON: ${(e as Error).message}`);
  process.exit(1);
}
const result = validateCatalog(raw);
if (result.ok) {
  const c = result.catalog;
  console.log(`✓ "${file}" is valid.`);
  console.log(
    `  ${c.components.length} components, ${c.instruments.length} instruments, ${c.orbits.length} orbits, ` +
      `${c.launchVehicles.length} launch vehicles, ${c.objectives.length} objectives, ${c.events.length} events.`,
  );
} else {
  console.error(`✗ "${file}" has ${result.errors.length} problem(s):`);
  for (const e of result.errors) console.error(`  • ${e}`);
  process.exit(1);
}
