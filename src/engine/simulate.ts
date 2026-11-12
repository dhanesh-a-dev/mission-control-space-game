/**
 * simulateMission(): "Fly the Mission".
 * Walks through the mission in time order (review → launch → arrival → operations → end)
 * and stops at the FIRST thing that breaks. Each step explains itself with real numbers.
 * With events on, a seeded random number picks surprises (same seed = same surprises,
 * so a mission can be replayed fairly).
 */
import type { Catalog, MissionEvent } from '../data/schema';
import { computeBudget, fmt, SOLAR_DEGRADATION_PER_YEAR, type Budget } from './budget';
import { checkConstraints, type Constraint, type ConstraintId, type Status } from './constraints';
import type { Design } from './design';
import { describeFix, RULES_OF_THUMB, suggestFixes, type FixTarget } from './explain';
import { score, type Score } from './score';

export type Phase = 'review' | 'launch' | 'cruise' | 'ops' | 'end';

export type Step = {
  when: string;
  phase: Phase;
  title: string;
  detail: string;
  status: Status;
  progress: number; // 0..1 position on the mission timeline
  event?: MissionEvent;
};

export type FixOption = { text: string; design: Design };
export type Failure = { headline: string; why: string; fixes: FixOption[]; ruleOfThumb: string; constraintId?: ConstraintId };

export type SimResult = {
  outcome: 'success' | 'failure';
  steps: Step[];
  failure?: Failure;
  budget: Budget;
  checks: Constraint[];
  score: Score;
  events: MissionEvent[];
};

export type SimOptions = { events?: boolean; seed?: number };

/** Small seeded random generator (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pct = (m: number) => `${Math.round(m * 100)}%`;

export function simulateMission(design: Design, catalog: Catalog, opts: SimOptions = {}): SimResult {
  const b = computeBudget(design, catalog);
  const checks = checkConstraints(design, catalog, b);
  const get = (id: ConstraintId) => checks.find((c) => c.id === id)!;
  const orbit = catalog.orbits.find((o) => o.id === design.orbitId);
  const launcher = catalog.launchVehicles.find((l) => l.id === design.launcherId);
  const objective = catalog.objectives.find((o) => o.id === design.objectiveId);

  const transfer = orbit?.transferMonths ?? 0;
  const opsMonths = Math.round(b.requiredLifeYears * 12);
  const totalMonths = transfer + opsMonths;
  // timeline position: review 0–5%, launch 8%, then months scaled to 10–100%
  const at = (month: number) => 0.1 + 0.9 * Math.min(1, month / Math.max(1, totalMonths));

  // pick surprise events (seeded)
  const random = rng(opts.seed ?? 1);
  const events: MissionEvent[] = [];
  if (opts.events && catalog.events.length) {
    const pool = [...catalog.events];
    for (let i = 0; i < 2 && pool.length; i++) events.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }

  const steps: Step[] = [];
  let failure: Failure | undefined;

  const fail = (step: Omit<Step, 'status'>, why: string, target: FixTarget, constraintId?: ConstraintId) => {
    steps.push({ ...step, status: 'fail' });
    const eventRule: Record<string, ConstraintId> = { power: 'power', solar: 'power', downlink: 'data', budget: 'budget', battery: 'battery' };
    const ruleKey = constraintId ?? (step.event ? eventRule[step.event.kind] : 'power');
    failure = {
      headline: step.title,
      why,
      constraintId,
      ruleOfThumb: step.event
        ? 'Surprises happen in space. Spare margin (power, storage, budget) is what saves missions.'
        : RULES_OF_THUMB[ruleKey],
      fixes: suggestFixes(design, catalog, target).map((f) => ({ text: describeFix(f), design: f.design })),
    };
  };
  const pass = (step: Omit<Step, 'status'>, status: Status = 'ok') => steps.push({ ...step, status });

  const run = (): void => {
    // 1. DESIGN REVIEW
    for (const id of ['orbitAllowed', 'instrumentType', 'slots', 'budget'] as ConstraintId[]) {
      const c = get(id);
      if (c.status === 'fail') {
        const titles: Record<string, string> = {
          orbitAllowed: 'Review board: wrong destination',
          instrumentType: 'Review board: no instrument for the job',
          slots: "Review board: instruments don't fit",
          budget: 'Review board: over budget, mission cancelled',
        };
        return fail({ when: 'T−12 months', phase: 'review', title: titles[id], detail: c.message, progress: 0.02 }, c.message, id, id);
      }
    }
    pass(
      {
        when: 'T−12 months',
        phase: 'review',
        title: 'Design review passed',
        detail: `The review board approves "${objective?.name}". ${get('budget').message}`,
        progress: 0.03,
      },
      get('budget').status,
    );

    // launch-delay surprise hits before launch
    const delay = events.find((e) => e.kind === 'budget');
    if (delay && launcher) {
      const extra = launcher.costM * delay.amount;
      const newCost = b.costM + extra;
      const step = { when: 'T−3 months', phase: 'review' as Phase, title: `Surprise: ${delay.name}`, progress: 0.05, event: delay };
      if (newCost > b.budgetCapM) {
        return fail(
          { ...step, detail: `${delay.description} Cost rises to $${fmt(newCost)}M, over your $${fmt(b.budgetCapM)}M cap.` },
          `The delay added $${fmt(extra, 2)}M and you had only $${fmt(b.budgetCapM - b.costM, 2)}M spare. Keep some budget in reserve.`,
          (nb) => nb.costM + (catalog.launchVehicles.find((l) => l.id === design.launcherId)?.costM ?? 0) * delay.amount <= nb.budgetCapM,
        );
      }
      pass({ ...step, detail: `${delay.description} You absorb $${fmt(extra, 2)}M thanks to your budget reserve.` }, 'warn');
    }

    // 2. LAUNCH
    for (const id of ['reach', 'mass'] as ConstraintId[]) {
      const c = get(id);
      if (c.status === 'fail') {
        const title = id === 'reach' ? "Launch scrubbed: rocket can't get there" : 'Launch scrubbed: too heavy for the rocket';
        const why =
          id === 'reach'
            ? c.message
            : `Your spacecraft weighs ${fmt(b.massKg)} kg but ${launcher?.name} can only carry ${fmt(b.capacityKg)} kg to ${orbit?.name}.`;
        return fail({ when: 'T+0', phase: 'launch', title, detail: why, progress: 0.08 }, why, id, id);
      }
    }
    pass(
      {
        when: 'T+0',
        phase: 'launch',
        title: 'Liftoff!',
        detail: `${fmt(b.massKg)} kg spacecraft on ${launcher?.name} (capacity ${fmt(b.capacityKg)} kg, ${pct(b.margins.mass)} spare).`,
        progress: 0.08,
      },
      get('mass').status,
    );

    if (transfer > 0) {
      pass({
        when: `Month ${transfer}`,
        phase: 'cruise',
        title: `Arrived at ${orbit?.name}`,
        detail: `After a ${transfer}-month cruise, the spacecraft reaches its destination.`,
        progress: at(transfer),
      });
    }

    // 3. FIRST DAY: power and the first eclipse
    const p = get('power');
    const startMonth = transfer;
    if (p.status === 'fail') {
      const why = `Your panels make ${fmt(b.powerGenW)} W on average here, but the spacecraft needs ${fmt(b.powerUseW)} W. It drains its battery and shuts down.`;
      return fail({ when: 'Day 1', phase: 'ops', title: 'Power failure: not enough sunlight energy', detail: why, progress: at(startMonth) }, why, 'power', 'power');
    }
    pass(
      {
        when: 'Day 1',
        phase: 'ops',
        title: 'Solar panels deployed',
        detail: `${p.message} Spare power: ${pct(b.margins.power)}${b.margins.power < 0.1 ? '. That is thin: engineers want at least 10%.' : '.'}`,
        progress: at(startMonth),
      },
      p.status,
    );
    const bat = get('battery');
    if (bat.status === 'fail') {
      const why = `${bat.message} The spacecraft freezes and loses power in the first shadow.`;
      return fail({ when: 'Day 1', phase: 'ops', title: 'Blackout in the first eclipse', detail: why, progress: at(startMonth) }, why, 'battery', 'battery');
    }
    if (b.batteryNeedWh > 0)
      pass({ when: 'Day 1', phase: 'ops', title: 'Survived the first eclipse', detail: bat.message, progress: at(startMonth) }, bat.status);

    // 4. SCIENCE begins
    const sci = get('science');
    if (sci.status === 'fail') {
      const why = sci.message + ' The science team says the results are too weak for the mission goal.';
      return fail({ when: 'Week 1', phase: 'ops', title: 'Science too weak', detail: why, progress: at(startMonth + 0.25) }, why, 'science', 'science');
    }
    pass({ when: 'Week 1', phase: 'ops', title: 'First science data', detail: sci.message, progress: at(startMonth + 0.25) }, sci.status);

    // 5. DATA: does the onboard storage overflow?
    const d = get('data');
    if (d.status === 'fail') {
      const backlog = b.dataGBPerDay - b.downlinkGBPerDay;
      const day = Math.max(1, Math.floor(b.storageGB / backlog));
      const why = `Your instruments make ${fmt(b.dataGBPerDay, 2)} GB/day but your radio can only send ${fmt(b.downlinkGBPerDay, 2)} GB/day from here. The ${fmt(b.storageGB)} GB storage fills up and new science is lost.`;
      return fail(
        { when: `Day ${day}`, phase: 'ops', title: 'Data jam: storage full', detail: why, progress: at(startMonth + day / 30) },
        why,
        'data',
        'data',
      );
    }
    pass({ when: 'Week 2', phase: 'ops', title: 'Data flowing home', detail: d.message, progress: at(startMonth + 0.5) }, d.status);

    // 6. OPERATIONS: yearly health checks, surprise events, and end of life
    type Tick = { month: number; kind: 'year' | 'event' | 'life'; year?: number; ev?: MissionEvent };
    const ticks: Tick[] = [];
    for (let y = 1; y <= Math.ceil(b.requiredLifeYears); y++) ticks.push({ month: Math.min(opsMonths, y * 12), kind: 'year', year: y });
    for (const ev of events.filter((e) => e.kind !== 'budget')) {
      ticks.push({ month: 1 + Math.floor(random() * Math.max(1, opsMonths - 2)), kind: 'event', ev });
    }
    if (b.lifeYears < b.requiredLifeYears) ticks.push({ month: Math.max(0.5, b.lifeYears * 12), kind: 'life' });
    ticks.sort((x, y) => x.month - y.month || (x.kind === 'life' ? -1 : 1));

    let solarLoss = 0; // permanent loss from damage events
    let batteryLoss = 0;
    for (const t of ticks) {
      const m = startMonth + t.month;
      const when = t.month >= 12 && t.month % 12 === 0 ? `Year ${t.month / 12}` : `Month ${Math.max(1, Math.round(t.month))}`;
      const genNow = b.powerGenW * (1 - SOLAR_DEGRADATION_PER_YEAR * (t.month / 12)) * (1 - solarLoss);

      if (t.kind === 'life') {
        const why = `The spacecraft stopped working after ${fmt(b.lifeYears)} years, limited by ${b.lifeLimit.reason}. The mission needed ${b.requiredLifeYears} years.`;
        return fail({ when, phase: 'ops', title: 'Spacecraft worn out too early', detail: why, progress: at(m) }, why, 'life', 'life');
      }
      if (t.kind === 'year') {
        if (genNow < b.powerUseW) {
          const why = `Solar panels age about ${SOLAR_DEGRADATION_PER_YEAR * 100}% per year${solarLoss ? ' (plus damage)' : ''}. By now they give ${fmt(genNow)} W but you need ${fmt(b.powerUseW)} W. This is why engineers keep 10%+ spare power.`;
          const need = 1 / (1 - SOLAR_DEGRADATION_PER_YEAR * b.requiredLifeYears) / (1 - solarLoss) - 1;
          return fail({ when, phase: 'ops', title: 'Aging panels: power runs out', detail: why, progress: at(m) }, why, (nb) => nb.margins.power >= need);
        }
        pass({
          when,
          phase: 'ops',
          title: `Year ${t.year} complete`,
          detail: `All systems healthy. Panels now give ${fmt(genNow)} W for ${fmt(b.powerUseW)} W needed.`,
          progress: at(m),
        });
        continue;
      }
      // surprise events
      const ev = t.ev!;
      const step = { when, phase: 'ops' as Phase, title: `Surprise: ${ev.name}`, progress: at(m), event: ev };
      if (ev.kind === 'power') {
        const need = b.powerUseW * (1 + ev.amount);
        if (genNow < need) {
          const why = `${ev.description} Use jumps to ${fmt(need)} W but panels give only ${fmt(genNow)} W. You needed more spare power.`;
          return fail({ ...step, detail: why }, why, (nb) => nb.margins.power >= ev.amount + 0.05);
        }
        pass({ ...step, detail: `${ev.description} Your spare power (${fmt(genNow)} W vs ${fmt(need)} W) carried you through.` }, 'warn');
      } else if (ev.kind === 'downlink') {
        const needGB = b.dataGBPerDay * ev.amount;
        if (needGB > b.storageGB) {
          const why = `${ev.description} You needed ${fmt(needGB)} GB of storage but have ${fmt(b.storageGB)} GB, so science was lost.`;
          return fail({ ...step, detail: why }, why, (nb) => nb.dataGBPerDay * ev.amount <= nb.storageGB && nb.margins.data >= 0);
        }
        pass({ ...step, detail: `${ev.description} ${fmt(needGB)} GB waited safely in your ${fmt(b.storageGB)} GB storage.` }, 'warn');
      } else if (ev.kind === 'solar') {
        solarLoss = ev.amount;
        const after = genNow * (1 - ev.amount);
        if (after < b.powerUseW) {
          const why = `${ev.description} Panels now give ${fmt(after)} W, below the ${fmt(b.powerUseW)} W you need.`;
          return fail({ ...step, detail: why }, why, (nb) => nb.margins.power >= ev.amount + 0.15);
        }
        pass({ ...step, detail: `${ev.description} Still ${fmt(after)} W for ${fmt(b.powerUseW)} W needed. Margin saved you.` }, 'warn');
      } else if (ev.kind === 'battery') {
        batteryLoss = ev.amount;
        const usable = b.batteryUsableWh * (1 - batteryLoss);
        if (usable < b.batteryNeedWh) {
          const why = `${ev.description} It now gives ${fmt(usable)} Wh but an eclipse needs ${fmt(b.batteryNeedWh)} Wh.`;
          return fail({ ...step, detail: why }, why, (nb) => nb.batteryUsableWh * (1 - ev.amount) >= nb.batteryNeedWh);
        }
        pass({ ...step, detail: `${ev.description} Still ${fmt(usable)} Wh for ${fmt(b.batteryNeedWh)} Wh needed.` }, 'warn');
      }
    }

    pass({
      when: `Year ${fmt(b.requiredLifeYears)}`,
      phase: 'end',
      title: 'Mission accomplished!',
      detail: `"${objective?.name}" completed its ${b.requiredLifeYears}-year mission with a science score of ${fmt(b.science)}.`,
      progress: 1,
    });
  };

  run();
  const outcome = failure ? 'failure' : 'success';
  const progress = steps[steps.length - 1]?.progress ?? 0;
  return { outcome, steps, failure, budget: b, checks, events, score: score(b, outcome, progress) };
}
