# LESSONS.md: build log

Use this to make the build prompt better for the real event.

| Phase | Planned | Actual | What worked | What broke → fix | Change the prompt next time |
|---|---|---|---|---|---|
| 0 Scaffold | 30 min | ~5 min | `create-vite` into a temp folder, then copied in (the folder wasn't empty). | Nothing. | Say "scaffold into the current folder even if it has files". |
| 1 Data layer | 2 h | ~15 min | zod schema + a custom cross-reference check gives friendly errors. `sync-data` copies the sample to the live and fallback files in one step. | Nothing. | Ask for a `sync-data` script up front. |
| 2 Engine + tests | 3 h | ~30 min | Search-based fix suggestions (try every single swap, keep the ones that fix the problem) instead of hand-written advice, so fixes stay correct when the data changes. A brute-force balance script proved each mission has many winning designs. | My first "good design" test failed its own science minimum → added a 2nd instrument. Some problems need 2 changes → added a "rule of thumb" line per problem type. TS config needed ES2022 and the tests excluded from the app build. | Ask for the balance script (`scripts/count-solutions.ts`) in Phase 2. |
| 3 Screens + dashboard | 4 h | ~40 min | One reducer for all state; the dashboard computes everything from the design each render (no stale numbers). "Because of X" chips came almost free from saving the previous budget. | `useEffect(() => window.scrollTo(...))` returned a value in the in-app browser → crash. Always use braces in effects. The mobile dashboard wasn't sticky because its parent was short → `display: contents` on the parent. | Tell Claude: "test at 375px and check sticky elements". |
| 4 Fly the Mission | 4 h | ~30 min | Simulate once, then reveal steps on a timer, so the animation can never disagree with the result. Fixes carry a ready-made design → "Apply & edit" button. | Eyebrow color overrode the red failure label (CSS order). | Ask for an "Apply fix" button from the start; it's the best teaching moment. |
| 5 Deploy | 1 h | not done | — | Needs your GitHub + Vercel accounts. | — |
