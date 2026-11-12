# Space Mission Design Game: Hackathon Plan + Build Prompt

> ⚠️ **Timing alert:** Space Apps 2026 runs **Nov 14–15, 2026**. Today is Nov 12. This is the **real** challenge, not a past one, so treat this as a dress rehearsal 2 days out. Every challenge listing says "more resources may be added before the hackathon begins", so check the Resources tab again on the morning of Nov 14.

---

## STEP 1: Understand the challenge

**In 3 sentences:**
1. The users are students and beginners who have studied space topics one at a time but have never designed a whole mission.
2. Their problem is that trade-offs (more instruments → more mass, power, data and cost) stay abstract, because current tools cover one subsystem at a time.
3. NASA wants an interactive game where players pick an objective, build a spacecraft, choose a launch vehicle and orbit, manage limited resources, simulate the mission, and learn *why* it worked or failed. Team play for up to 4 people is a bonus.

**Judging angles and what a top score looks like:**

| Angle | Top-scoring version |
|---|---|
| Impact | A 14-year-old can play a full mission in 5 minutes and explain one real trade-off afterwards. |
| Creativity | Consequences are *visible*: change one part and watch the effects ripple through every resource. Not just a form with a pass/fail result. |
| Validity | Component numbers are close to real figures (CubeSat parts, real launch vehicle classes, real orbit types), with sources cited. Simple physics that is honest about what it simplifies. |
| Relevance | Covers everything the brief lists: objective → spacecraft → instruments → launch → orbit → resources → simulation → evaluation → roles. |
| Presentation | One clear demo story: "my first design fails, here is why, I fix it, it succeeds." Polished and reliable. |

**Data and resources (honest status):**
- I **could not open** the challenge's Resources tab (the request failed). Search turned up nothing specific to this challenge. **Before you build, open the Resources tab yourself and paste what it lists into the build session.**
- This challenge is a game, not a data-analysis task. Your "data" is a **catalog of components, launch vehicles and orbits**, which you write as JSON from public NASA references. That makes the data-agnostic design simple and low-risk.
- NASA references I know exist. Each one is **unverified as part of this challenge's list**, so check every link before you cite it:
  - NASA *State-of-the-Art of Small Spacecraft Technology* report (search "NASA SST SoA"). It gives realistic mass, power and cost ranges for CubeSat parts. Free web/PDF, no key needed.
  - *NASA Systems Engineering Handbook* (SP-2016-6105). Background for how mission trade-offs work. Free PDF.
  - NASA Images API `https://images-api.nasa.gov`. No key needed. Optional, for spacecraft and planet pictures.
  - NASA Open APIs `https://api.nasa.gov`. Free key; `DEMO_KEY` allows about 30 requests per hour. **The MVP doesn't need it.**
- Rules note: Space Apps terms require you to **cite every resource, including open-source ones**.

**Clarifying questions:** none needed. My assumptions:
- You build mostly alone.
- You get 48 hours.
- The judges watch a video and click a link, so "team play" means **pass-and-play on one device with roles**, not live online multiplayer. Live multiplayer is the most common way hackathon demos break.

---

## STEP 2: Feature brainstorm

Scores: Impact / Wow / Effort / Data risk (1–5; low effort and low risk are good).

| # | Feature | I | W | E | R | Tier |
|---|---|---|---|---|---|---|
| 1 | Mission objective cards (Earth imaging, Mars orbiter, comms relay, space weather), each with its own requirements | 5 | 3 | 2 | 1 | **1** |
| 2 | Spacecraft builder: pick parts from catalog categories (power, battery, comms, computer, attitude control, instruments) | 5 | 3 | 3 | 1 | **1** |
| 3 | Live resource dashboard: mass, power, budget, data/day vs downlink/day, lifetime, with red/amber/green gauges | 5 | 4 | 2 | 1 | **1** |
| 4 | Launch vehicle + orbit picker with compatibility check (mass to orbit, cost) | 5 | 3 | 2 | 1 | **1** (merged into 2) |
| 5 | **Mission simulation + post-mortem**: an animated timeline (launch → orbit → operations by month) that fails at the first broken constraint and explains why in plain English | 5 | 5 | 3 | 1 | **1 ★ signature** |
| 6 | "Ripple" highlight: on each change, the gauges that moved pulse and a short "because…" chip appears | 4 | 5 | 2 | 1 | **2** |
| 7 | Roles / pass-and-play team mode (Mission Lead, Spacecraft Engineer, Scientist, Ops/Comms), each owning some decisions, with conflict prompts | 4 | 4 | 3 | 1 | **2** |
| 8 | Random events during the sim (solar flare, ground station outage, launch delay) | 4 | 4 | 2 | 1 | **2** |
| 9 | Score breakdown: science value, efficiency, margin, cost | 4 | 3 | 1 | 1 | **2** (simple version in Tier 1) |
| 10 | Share a design by URL + compare two designs | 3 | 3 | 2 | 1 | **2** |
| 11 | Difficulty levels (Cadet / Engineer / Flight Director) | 3 | 2 | 2 | 1 | **2** |
| 12 | Glossary tooltips ("What is LEO?") everywhere | 4 | 2 | 1 | 1 | **1** (part of the UI) |
| 13 | 2D orbit visual (SVG circle with spacecraft, ground station contact arcs) | 3 | 4 | 3 | 1 | **2** |
| 14 | AI "mission advisor" that explains your failure in a chat | 3 | 4 | 3 | 4 | **3** (needs an API key and can fail live; rule-based explanations are better here) |
| 15 | Live online multiplayer (4 devices) | 4 | 5 | 5 | 4 | **3** |
| 16 | 3D spacecraft model | 2 | 5 | 5 | 2 | **3** |
| 17 | Leaderboard | 2 | 3 | 3 | 3 | **3** |
| 18 | Real orbital mechanics (GMAT-level) | 3 | 3 | 5 | 3 | **3** |
| 19 | Multilingual, offline PWA | 3 | 2 | 2 | 1 | **3** |
| 20 | Teacher mode / classroom challenge codes | 4 | 2 | 4 | 2 | **3** |

**Signature feature: the Mission Simulation + Post-Mortem (#5).** It is the moment the game teaches something. Players see their mission *live and die* on a timeline, for example "Month 3: data buffer full, science lost because your downlink (2 GB/day) can't keep up with your camera (6 GB/day)", and then they fix it. It turns abstract trade-offs into a story. It is also cheap to build, because it is just rules running over the catalog.

**Impressive but risky:** live multiplayer, an AI advisor, 3D models, real orbital physics. All four go to the roadmap.

---

## STEP 3: Concepts

| Concept | Pitch | Helps | Data | Difficulty | Wow | Weakness |
|---|---|---|---|---|---|---|
| **A. "Mission Control: Build, Launch, Learn"** ✅ | Design a spacecraft, launch it, watch it live or fail, and learn why. | Students and beginners | Component/launcher/orbit catalog sourced from NASA small-sat references | 2 | 4 | Not real multiplayer |
| B. Card-based board game | Draw part cards, play them against a budget | Younger players | Same catalog | 2 | 3 | Feels less like engineering, so it scores lower on validity |
| C. Online 4-player co-op room | Each player controls a subsystem in real time | Classrooms | Same + a realtime backend | 5 | 5 | High chance it breaks in the demo; too much for a beginner in 48h |

**Recommendation: A.** It is the only concept a beginner can finish *and* polish in 48h, it covers every item in the brief, and its signature moment (failure → explanation → fix) makes a great 2-minute video. Pass-and-play roles (Tier 2) answer the collaboration point without needing a server.

---

## STEP 4: The build prompt

Copy everything inside the block below into a fresh Claude Code session in an empty folder.

````text
You are my senior engineer and teacher. I am an 18-year-old beginner. Build a polished, deployable web game for the NASA Space Apps Challenge 2026 challenge "Space Mission Design Game". Explain each step in plain beginner language, including WHY, because I must present and defend this project to judges. Work in small phases. After every phase: run the app, check it yourself in the browser, then tell me exactly what to click and what I should see. Do not start the next phase until the current one works.

=== 1. GOAL ===
An interactive game where a player (or a team of up to 4 on one device) chooses a mission objective, designs a spacecraft, picks instruments, a launch vehicle and an orbit, while juggling mass, power, budget, data, communications and lifetime. Then they SIMULATE the mission and get a plain-English post-mortem explaining why it succeeded or failed. They can tweak the design and fly again.
Name: "Mission Control: Build, Launch, Learn" (you may suggest a better short name).

=== 2. USER, PROBLEM, SIGNATURE FEATURE ===
User: students aged 13+ with no engineering background.
Problem: mission trade-offs are abstract; current tools teach one subsystem at a time.
SIGNATURE FEATURE: "Fly the Mission". An animated timeline (Launch → Orbit insertion → Operations month by month → End of life). It stops at the first constraint that breaks, shows WHERE and WHY in one friendly sentence with the actual numbers, and suggests 1–2 concrete fixes. If nothing breaks, it shows a success report with a score breakdown. This must be the most polished part of the app.

=== 3. FEATURES ===
TIER 1 (build now, must be flawless):
 T1-a Objective picker: 3 mission cards (e.g. "Earth Watcher" wildfire imaging in LEO, "Red Planet Scout" Mars orbiter, "Storm Sentinel" space-weather monitor). Each card has requirements (min science value, required instrument type, required orbit or destination, budget cap, min lifetime).
 T1-b Builder: choose 1 option per subsystem (bus/structure size, solar panels, battery, comms radio, onboard computer, attitude control) plus 0–3 instruments, a launch vehicle and an orbit. Every option shows mass, power draw or generation, cost, and data (where relevant), plus a 1-line "what is this?" tooltip.
 T1-c Live resource dashboard (always visible, sticky on mobile): Mass (vs launcher capacity to the chosen orbit), Power (generated vs consumed, with margin %), Budget (spent vs cap), Data (generated per day vs downlink per day), Lifetime (estimated vs required), Science value. Green ≥10% margin, amber 0–10%, red = broken. Use icons + text, not color alone.
 T1-d Fly the Mission + Post-mortem (signature, described above) + a simple score (0–100) and a "Fly again" button that keeps the design.
TIER 2 (in this order, only after Tier 1 is polished and deployed):
 1. Ripple effect: when a choice changes, the gauges that moved pulse and show a short "because…" chip (e.g. "+40 W power because of Hyperspectral Camera").
 2. Random events during the sim (solar flare, ground station outage, launch delay), each testing a margin. Toggle on/off.
 3. Team mode (pass-and-play): 2–4 players, roles Mission Lead (objective, budget), Spacecraft Engineer (bus, power, ADCS), Science Lead (instruments), Ops & Comms (comms, orbit, launcher). Each role sees its own section highlighted. A "Team Review" screen shows conflicts (e.g. Science wants 3 instruments but power is red) and requires all players to tap "Approve" before launch.
 4. Difficulty: Cadet (bigger margins, hints) / Engineer / Flight Director (tight budget, events on).
 5. Share design via URL (encode state in the URL hash) + compare two designs side by side.
 6. Simple 2D SVG orbit view showing the spacecraft and ground-station contact windows.
DO NOT BUILD: user accounts, a database, live online multiplayer, an AI chatbot, 3D models, real orbital mechanics, leaderboards, payments. These go in the README "Roadmap".

=== 4. TECH STACK ===
- Vite + React + TypeScript. Reason: fastest dev loop, huge docs, static output that Vercel hosts for free. No backend needed.
- Plain CSS with CSS variables (or Tailwind if you think it is faster). Pick one and stay consistent.
- Framer Motion is optional for the timeline animation; CSS animations are fine.
- State: React useReducer + context. No state library.
- Testing: Vitest for the rules engine (pure functions).
- Accounts needed: GitHub (free), Vercel (free, sign in with GitHub). NO API keys and NO environment variables are needed for the MVP. Explain how to create both accounts step by step if I ask.
- Node.js LTS must be installed. Check with `node -v` first and tell me how to install it if missing.

=== 5. DATA-AGNOSTIC ARCHITECTURE (critical) ===
All game content is DATA, not code. The UI and rules engine never hard-code a component.
 src/data/schema.ts       → TypeScript types + a runtime validator (use zod) for Catalog, Component, LaunchVehicle, Orbit, Objective, Event.
 src/data/adapter.ts      → loadCatalog(): tries `public/data/catalog.json`, validates it with the schema, and on any error falls back to the bundled `src/data/fallback/catalog.json`, showing a small "using offline data" notice. ONLY this file knows where data comes from.
 src/data/sample/         → realistic sample data in the exact schema (about 4 options per subsystem, 6 instruments, 4 launch vehicles, 4 orbits, 3 objectives, 5 events). Use realistic small-sat numbers (CubeSat/SmallSat class, informed by NASA's "State-of-the-Art of Small Spacecraft Technology" report). Add a `source` and `note` field to each item. If a number is an estimate, say "estimate" in the note. Never invent fake citations.
 src/engine/              → pure functions: computeBudget(design, catalog), checkConstraints(), simulateMission(design, catalog, seed) → list of timeline events, explainFailure(), score(). All tested with Vitest.
 src/ui/                  → React components only.
 docs/PLUG_IN_NEW_DATA.md → a beginner guide: "If NASA gives you new data (CSV/JSON/API): 1) look at it, 2) write a small mapping in adapter.ts that converts it into our schema, 3) run `npm run validate-data`, 4) run the tests." Include a script `npm run validate-data` that validates any JSON file against the schema and prints friendly errors.
Rules engine formulas: keep them simple and explain them in code comments AND in-game:
 - Total mass = sum of parts; must be ≤ launcher capacity for that orbit (launcher has capacityByOrbit).
 - Power: generation × orbit sunlight factor ≥ consumption × 1.1 (10% margin). Battery must cover the eclipse time for the orbit.
 - Data: instruments' data per day ≤ comms downlink per day × the orbit's contact factor; otherwise the buffer fills on day N (compute N from onboard storage).
 - Budget: parts + launcher + ops cost per year × lifetime ≤ cap.
 - Lifetime: limited by the orbit (e.g. very low LEO decays), battery cycles, and the component with the shortest life.
 - Science value: sum of instrument values × an orbit-fit multiplier for this objective.

=== 6. FOLDER STRUCTURE & PHASES ===
Phase 0 (30 min): scaffold Vite React TS, git init, first commit, create LESSONS.md. Run the dev server. Tell me what I should see.
Phase 1 (2h): schema + sample data + adapter + fallback + validate-data script. Show me the validator catching a broken file.
Phase 2 (3h): engine + Vitest tests (at least: overweight design, power deficit, data overflow, budget overrun, a good design passes). Run tests and show the results.
Phase 3 (4h): Landing screen + objective picker + builder + live dashboard. Mobile first.
Phase 4 (4h): Fly the Mission timeline + post-mortem + score + fly again. This is the signature: polish it.
Phase 5 (1h): Deploy to Vercel (see section 8). Tier 1 is DONE only when the live URL works on my phone.
Phase 6+: Tier 2 features in order, deploying after each one.
Final phase: README, accessibility pass, Lighthouse check, demo-path rehearsal.
After each phase: commit with a clear message, then update LESSONS.md (what worked, what broke, how long it took).

=== 7. DESIGN DIRECTION ===
Feel: a calm, modern mission-control room. Clean, not cluttered, not cartoonish.
Colors: background Deep Space #0B1020; panels #141A2E; borders #26304D; text #E8ECF7; muted text #9AA5C4; primary accent NASA-inspired blue #4C8DFF; success #34D399; warning #FBBF24; danger #F87171; highlight #A78BFA. All text contrast must pass WCAG AA.
Fonts (Google Fonts): "Space Grotesk" for headings, "Inter" for body text, "JetBrains Mono" for numbers on the gauges.
First screen (the 5-second test): headline "Design a space mission. Launch it. Find out why it worked or failed." A subtitle line, one big "Start a Mission" button, and a 3-step strip (Choose objective → Build spacecraft → Fly the mission). Add a subtle starfield (CSS only, respect prefers-reduced-motion).
Accessibility: full keyboard use, visible focus rings, aria-labels on gauges, never color alone (icons + words), works at 360px width, reduced-motion support.
Do not use NASA logos or the "meatball" insignia (it is not allowed without permission). Say "Data inspired by NASA public references".

=== 8. DEPLOYMENT ===
1. Create a public GitHub repo, then push (explain each git command).
2. vercel.com → Add New Project → import the repo → framework Vite → Deploy.
3. No env vars needed. Every push to main redeploys automatically. Explain what a preview deployment is.
4. Test the live URL on desktop and phone.

=== 9. README ===
Sections: Problem • What the game does (with a screenshot/GIF) • How to play • How the rules engine works (plain formulas) • Data sources with credit (list each NASA reference used, with link, and mark estimates) • How to run locally • How to plug in new data • Roadmap (Tier 3) • Honest AI usage note: "This project was built with help from Claude Code (an AI coding assistant). The team designed the game, chose the features, checked the numbers, and tested every screen. AI generated much of the code under our direction." • License (MIT).

=== 10. TEACHING ===
For every phase, end with a "What you just built, in plain English" box (3–5 sentences) plus 2 questions a judge might ask about it, with answers.

=== 11. LESSONS.md ===
Keep it updated after every phase: phase, planned time, actual time, what worked, what broke and how it was fixed, what to change in this prompt next time.

Start with Phase 0 now. Before you write code, list in 5 lines what you are about to do.
````

---

## STEP 5: Submission kit

### 48-hour timeline

| Hours | You | Claude Code |
|---|---|---|
| 0–1 | Read the challenge again, check the Resources tab, paste the build prompt | Phase 0 |
| 1–6 | Review the sample numbers against the NASA references (validity!) | Phases 1–2 |
| 6–14 | Test every screen on your phone; note bugs | Phase 3 |
| 14–20 | **Sleep 6h** (seriously) | – |
| 20–26 | Write the demo story; test the failure → fix path | Phase 4 (signature) |
| 26–28 | Check the live URL on your phone | Phase 5 deploy ✅ |
| 28–36 | Pick Tier 2 features in order | Tier 2 items 1–3 |
| **36** | **🧊 FEATURE FREEZE**: bug fixes only after this | – |
| 36–40 | Record screen captures, write the description | README, accessibility pass |
| 40–45 | **Polish & rehearse**: record the 2-min video, answer the judge Qs out loud | Fix bugs found in rehearsal |
| 45–47 | Submit (form, video link, repo, live URL) | – |
| 47–48 | Buffer for disasters | – |

### 2-minute demo video script
- **0:00–0:15** (hook): "Every NASA mission is a balancing act. Add one camera, and you change the mass, the power, the data, and the budget. Students never get to feel that. Now they can."
- **0:15–0:35**: Landing screen → pick "Earth Watcher: track wildfires from orbit." Show the requirements card.
- **0:35–1:05**: Build fast. Add the big hyperspectral camera; the gauges ripple and power turns amber. Pick a small radio and a cheap launcher.
- **1:05–1:25** (signature): "Fly the Mission." The timeline runs, then: *"Month 2 — Data buffer full. Your camera makes 6 GB/day but your radio can only send 1.5 GB/day. Try a higher-gain radio or an orbit with more ground-station passes."*
- **1:25–1:45**: Upgrade the radio. Now mass is too high for the launcher, so swap launchers (budget goes up). Fly again → success, score 82.
- **1:45–2:00**: "No single right answer. Just trade-offs, like the real thing. Built for classrooms, playable solo or as a team of four. [Team mode shot]. Mission Control: Build, Launch, Learn."

### Project description (≈190 words)
> Designing a space mission means balancing competing demands: every instrument adds science, but also mass, power, data and cost. Students usually learn these topics one at a time and never feel how they interact. **Mission Control: Build, Launch, Learn** is a browser game where players pick a mission objective, assemble a spacecraft from realistic small-satellite components, and choose an instrument suite, launch vehicle and orbit, while a live dashboard tracks mass, power, budget, data, communications and lifetime. Then they **fly the mission**: an animated timeline runs from launch to end of life and stops at the first broken constraint, explaining in plain English what failed, why, and how to fix it. Players redesign and fly again, discovering that there is never one perfect answer. Teams of up to four can play on one device with distinct roles (Mission Lead, Spacecraft Engineer, Science Lead, Ops & Comms) that must approve the design together. All game content lives in a validated data catalog informed by NASA public small-spacecraft references, so new parts, missions or datasets can be added without changing code. It runs on any phone or laptop with no install or account.

### 10 judge questions
1. **Are your numbers real?** They're order-of-magnitude realistic, based on NASA's small-spacecraft state-of-the-art references. Each item has a source/note field, and estimates are labeled. The goal is to get the *relationships* right, not to replace engineering tools.
2. **Why not real orbital mechanics?** Beginners need cause → effect in seconds. We model each orbit with a few factors (sunlight %, contact time, decay) and explain them. Real physics (e.g. GMAT) is on the roadmap.
3. **How is it collaborative without a server?** Pass-and-play with roles that each own decisions, plus a joint approval step. That's how a classroom with one screen actually works, and it can't break in the demo.
4. **What do players actually learn?** That subsystems are coupled. The post-mortem names the exact numbers that conflicted and suggests fixes, so players learn *why*, not just pass/fail.
5. **Is there one correct design?** No. Several combinations pass every objective, with different scores for cost, margin and science.
6. **How would you add new missions or NASA data?** Edit or replace the JSON catalog. The adapter validates it against a schema; there's a validator script and a guide.
7. **What happens if the data fails to load?** A bundled fallback catalog loads and a notice appears.
8. **How did you use AI?** Claude Code wrote much of the code under my direction. I designed the game, the rules and the features, checked the numbers, and tested everything. It's disclosed in the README.
9. **Is it accessible?** Keyboard-playable, AA contrast, icons + text (not color alone), reduced-motion support, works on a 360px phone.
10. **What's next?** Online co-op rooms, teacher challenge codes, more missions (lunar lander, deep space), real orbit visualization, translations.

### Rules checklist (verify against the official pages before submitting)
- [ ] Read the official Space Apps rules/terms (spaceappschallenge.org/legal) and the **Project Submission Guide**.
- [ ] Check the current rules on **AI tool use** and disclose AI use exactly as required (README + submission form).
- [ ] **Cite every resource**, including open-source libraries and NASA references.
- [ ] No NASA logo/insignia, and nothing implying NASA endorsement.
- [ ] Repo is public; the live URL works in a private/incognito window.
- [ ] Video is within the required length and the link is publicly viewable.
- [ ] Team members are registered and the right challenge is selected.
- [ ] Submit before the deadline in **your local event's time zone**.

---

## STEP 6: Event-day checklist (first 2 hours)

1. **(0:00)** Open the challenge page → **Resources tab**. Copy every link into `RESOURCES.md`. Note anything new since Nov 12.
2. **(0:10)** If any resource contains data (CSV/JSON/API), download one sample. Open it and write down its columns/fields, units, and size. Ask Claude: *"Here is a sample of the data. Map it to our schema in `src/data/schema.ts` and tell me which fields are missing."*
3. **(0:30)** Decide: does this data replace or extend the catalog (e.g. real instrument specs, real launcher capacities)? If it doesn't fit the game, cite it as background and keep the sample catalog.
4. **(0:45)** Paste the build prompt into a fresh session, adding at the top: *"Updated resources: [paste]. Data sample: [paste]. Adjust the schema and adapter in Phase 1 accordingly."*
5. **(1:00–2:00)** Let Phases 0–1 run. **Gate check:** `npm run validate-data` passes on the real-derived data, and the fallback loads if you rename the file.
6. Start a timer for every phase and log it in `LESSONS.md`.

---

**Sources:** [Space Apps 2026](https://www.spaceappschallenge.org/2026/) · [Participant FAQs](https://www.spaceappschallenge.org/resources/participant-faqs/) · [Project Submission Guide](https://www.spaceappschallenge.org/resources/project-submission-guide/) · [Legal / Terms](https://www.spaceappschallenge.org/legal/) · [Astrobiology.com: 2026 registration open](https://astrobiology.com/2026/09/04/registration-is-now-open-for-the-2026-nasa-space-apps-challenge/)
