# How to plug in new data (beginner guide)

The game never hard-codes a part, rocket, orbit or mission. Everything comes from **one JSON catalog** that must match `src/data/schema.ts`. To change the game's content, you change data, not code.

## Where the files are
| File | What it is |
|---|---|
| `src/data/sample/catalog.json` | **The one you edit.** |
| `public/data/catalog.json` | Live copy the app downloads when it starts. |
| `src/data/fallback/catalog.json` | Backup copy built into the app. Used if the live copy is missing or broken, so the demo never breaks. |
| `src/data/adapter.ts` | The only code that knows where data comes from. |

## Case A: add or change items by hand
1. Open `src/data/sample/catalog.json` and copy an existing item (for example a radio in `components`).
2. Give it a new unique `id`, change the numbers, and fill in `source` (where the number came from) and `note` (write "Estimate" if it is one).
3. Check it: `npm run validate-data -- src/data/sample/catalog.json`
4. Copy it to the live and backup files: `npm run sync-data`
5. Run the tests: `npm test`
6. Optional: check the missions are still winnable: `npx tsx scripts/count-solutions.ts`

## Case B: NASA gives you a new dataset (CSV / JSON / API)
1. **Look at it.** Open a sample. Write down the columns/fields, their units, and how many rows there are.
2. **Match it to our shape.** For each NASA field, decide which schema field it becomes. For example:
   - instrument mass in grams → `massKg` (divide by 1000)
   - orbit altitude → the orbit's `altitudeLabel`, plus your estimates for `eclipseMinutes`, etc.
   - Fields you don't have? Keep the sample values and say so in `note`.
3. **Write a small mapping function** in `src/data/adapter.ts`, for example:
   ```ts
   function mapNasaData(raw: NasaRow[]): Partial<Catalog> {
     return { instruments: raw.map((r) => ({ id: r.ID, name: r.Name, type: 'camera', massKg: r.mass_g / 1000, /* … */ source: 'NASA dataset X', note: '' })) };
   }
   ```
   Merge the result with the sample catalog, then pass it through `validateCatalog()`. Easier still: run the mapping once in a script and save the output as `src/data/sample/catalog.json`.
4. **Validate:** `npm run validate-data -- path/to/new.json`. It lists every problem in plain English.
5. `npm run sync-data`, then `npm test`, then `npm run dev` and play one mission end to end.

## What the validator checks
- Every field has the right type and is never negative.
- Each category (bus, solar, battery, comms, computer, adcs) has at least one item, with its special field (for example a battery needs `batteryWh` and `batteryCycles`).
- Rockets and missions only mention orbits that exist.
- Every mission has at least one instrument that can satisfy it.
- No duplicate ids.

Try it: `npm run validate-data -- scripts/broken-example.json` shows what errors look like.
