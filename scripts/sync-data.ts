/**
 * Copy the authoring catalog (src/data/sample/catalog.json) to:
 *  - public/data/catalog.json      (the live file the app fetches)
 *  - src/data/fallback/catalog.json (the offline backup bundled in the app)
 * It refuses to copy an invalid file.
 * Usage: npm run sync-data   (or: npm run sync-data -- path/to/other.json)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { validateCatalog } from '../src/data/schema';

const src = process.argv[2] ?? 'src/data/sample/catalog.json';
const text = readFileSync(src, 'utf8');
const result = validateCatalog(JSON.parse(text));
if (!result.ok) {
  console.error(`✗ Not syncing: "${src}" is invalid.`);
  result.errors.forEach((e) => console.error('  • ' + e));
  process.exit(1);
}
for (const dest of ['public/data/catalog.json', 'src/data/fallback/catalog.json']) {
  mkdirSync(dest.substring(0, dest.lastIndexOf('/')), { recursive: true });
  writeFileSync(dest, text);
  console.log(`✓ Copied to ${dest}`);
}
