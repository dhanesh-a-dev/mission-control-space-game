/**
 * THE DATA ADAPTER: the ONLY file that knows where game data comes from.
 *
 * 1. Try to load the live catalog from /data/catalog.json (public/data/catalog.json).
 * 2. Check it against the schema.
 * 3. If anything goes wrong (network error, broken file), use the copy bundled
 *    inside the app (src/data/fallback/catalog.json) so the demo never breaks.
 *
 * NEW DATA AT THE EVENT? Write a small `mapNasaData(raw)` function here that
 * converts NASA's format into our Catalog shape, then call it in loadCatalog().
 */
import fallbackRaw from './fallback/catalog.json';
import { validateCatalog, type Catalog } from './schema';

export type LoadResult = { catalog: Catalog; usingFallback: boolean; problems: string[] };

export async function loadCatalog(url = '/data/catalog.json'): Promise<LoadResult> {
  const problems: string[] = [];
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: unknown = await res.json();
    const result = validateCatalog(raw);
    if (result.ok) return { catalog: result.catalog, usingFallback: false, problems };
    problems.push(...result.errors);
  } catch (err) {
    problems.push(`Could not load ${url}: ${(err as Error).message}`);
  }
  return { catalog: loadFallbackCatalog(), usingFallback: true, problems };
}

export function loadFallbackCatalog(): Catalog {
  const result = validateCatalog(fallbackRaw);
  if (!result.ok) throw new Error('The bundled fallback catalog is invalid:\n' + result.errors.join('\n'));
  return result.catalog;
}
