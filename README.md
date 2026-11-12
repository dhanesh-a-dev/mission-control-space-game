# Mission Control: Build, Launch, Learn

**Design a space mission. Launch it. Find out why it worked or failed.**
A browser game for the NASA Space Apps Challenge 2026 challenge *"Space Mission Design Game"*.

> 📸 _Add a screenshot or GIF of "Fly the Mission" here before submitting._

## The problem
Designing a mission means balancing competing demands. A better instrument adds science, but also mass, power, data and cost. Students usually learn orbits, power and communications one at a time, so they never *feel* how the pieces pull against each other.

## What the game does
1. **Choose an objective**: Earth Watcher (wildfires, starter), Storm Sentinel (solar storms at L1, medium) or Red Planet Scout (Mars orbiter, hard).
2. **Build the spacecraft**: pick a bus, solar panels, battery, radio, computer, attitude control, up to 3 instruments, an orbit and a rocket. A **live dashboard** tracks mass, power, battery, budget, data, lifetime and science with ✓ OK / ! Tight / ✕ Broken labels. Every change shows *"Because of X: +12 W power use, +$1.5M cost…"*.
3. **Fly the Mission** (signature feature): an animated timeline (design review → launch → arrival → first eclipse → science → yearly checks → end of mission) that **stops at the first thing that breaks** and explains it with real numbers, e.g. *"Day 7: Data jam. Your instruments make 6 GB/day but your radio can only send 1.5 GB/day."* It then suggests the cheapest fixes, each with an **Apply & edit** button.
4. **3D views**: your spacecraft is built live in 3D as you pick parts (bigger bus = bigger body, more solar power = longer unfolding wings, fast radio = dish antenna, instruments appear as colored lenses). During Fly the Mission a 3D scene shows the launch, the cruise, and the orbit around Earth or Mars (or the L1 point between Earth and Sun). A failure shows as a rocket exploding or a dead spacecraft tumbling away. The look is computed from the catalog numbers, so new data gets a sensible model automatically. A flat drawing replaces 3D if the device cannot run it, and there is a 3D on/off switch.
5. **Score** (0–100) rewards science AND healthy margins. **Random events** (solar flare, ground-station outage, launch delay, micrometeoroid, battery cold snap) test whether you left room for surprises.

There is no single right answer: a brute-force search (`scripts/count-solutions.ts`) finds **1,522** winning designs for Earth Watcher, **6,764** for Storm Sentinel and **48** for Red Planet Scout.

## How the rules engine works (plain formulas)
| Resource | Rule |
|---|---|
| Mass | sum of all parts ≤ rocket capacity *to the chosen orbit* |
| Power | panel watts × share of time in sunlight × sunlight strength (Mars ≈ 0.43) ≥ power used. Keep 10% spare, because panels age ~3%/year |
| Battery | 50% of battery capacity ≥ power used × longest eclipse |
| Data | instrument GB/day (halved by onboard processing) ≤ radio GB/day × orbit contact factor. Otherwise storage fills on day *storage ÷ backlog* |
| Budget | parts + rocket + operations/year × mission years ≤ cap |
| Lifetime | the weakest link: orbit decay, battery charge cycles, or the shortest-lived part |
| Science | Σ instrument value × orbit fit for this objective (half value if pointing is too rough) |

Fix suggestions are **not hand-written**: the engine tries every single swap (each part, rocket, orbit, adding or removing an instrument), re-runs the rules, and lists the cheapest changes that fix the problem without breaking anything else. So the advice stays correct when the data changes.

## Data sources & credit
All values are **simplified estimates for learning**, rounded and labelled as estimates in the catalog (`note` field). Each item names its `source`.
- NASA, *Small Spacecraft Technology State-of-the-Art* report: typical CubeSat/SmallSat part ranges. https://www.nasa.gov/smallsat-institute/sst-soa/
- NASA Earth Observatory, *Catalog of Earth Satellite Orbits*: orbit types. https://earthobservatory.nasa.gov/features/OrbitsCatalog
- NASA Mars Exploration: sunlight at Mars. https://science.nasa.gov/mars/
- Launch prices are generic vehicle classes based on publicly reported prices (estimates), not specific products.
- Mission scenarios are inspired by NASA Earth science, space-weather (L1) and Mars orbiter missions; their requirements are game values.

Not affiliated with or endorsed by NASA. No NASA logos are used.

Open-source libraries: React, Vite, TypeScript, Zod, Vitest, Three.js, React Three Fiber, Drei (MIT licences). Fonts: Space Grotesk, Inter, JetBrains Mono (Google Fonts, OFL).

## Run it locally
You need [Node.js LTS](https://nodejs.org).
```bash
npm install
npm run dev          # open the printed http://localhost:5173 link
npm test             # run the rules-engine tests
npm run validate-data   # check public/data/catalog.json
npm run build        # production build into dist/
```

## Plug in new data
All content lives in one JSON catalog. See **[docs/PLUG_IN_NEW_DATA.md](docs/PLUG_IN_NEW_DATA.md)**. In short: edit `src/data/sample/catalog.json` → `npm run validate-data -- src/data/sample/catalog.json` → `npm run sync-data` → `npm test`.

## Project structure
```
src/data/schema.ts        the data contract (zod) + friendly validator
src/data/adapter.ts       the ONLY file that knows where data comes from (with offline fallback)
src/data/sample/          the catalog you edit
src/data/fallback/        bundled backup copy (used if loading fails)
public/data/catalog.json  the live copy the app loads
src/engine/               pure rules: budget, constraints, simulate, explain (fixes), score + tests
src/ui/                   React screens: Landing, ObjectivePicker, Builder, Dashboard, FlyMission
src/ui/three/             3D spacecraft + mission scene, flat fallback, design→visual mapping
scripts/                  validate-data, sync-data, count-solutions
```

## Roadmap (not built yet)
- Team mode: pass-and-play roles (Mission Lead, Spacecraft Engineer, Science Lead, Ops & Comms) with a joint "Team Review" approval
- Difficulty levels, share-a-design links, side-by-side design comparison
- 2D orbit view with ground-station passes
- Online co-op rooms for up to 4 devices, teacher challenge codes, leaderboards
- More missions (lunar lander, asteroid flyby), real orbital mechanics, translations

## How AI was used
This project was built with help from Claude Code (an AI coding assistant). The team designed the game, chose the features, checked the numbers, and tested every screen. AI generated much of the code under our direction.

## License
MIT
