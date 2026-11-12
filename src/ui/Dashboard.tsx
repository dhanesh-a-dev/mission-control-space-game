/**
 * Live resource dashboard: always visible while building.
 * Every gauge uses an icon AND a word (OK / Tight / Broken), never color alone.
 */
import { computeBudget, checkConstraints, fmt, type Budget, type Constraint, type ConstraintId, type Status } from '../engine';
import { useGame } from './state';

export const STATUS_TEXT: Record<Status, { icon: string; word: string }> = {
  ok: { icon: '✓', word: 'OK' },
  warn: { icon: '!', word: 'Tight' },
  fail: { icon: '✕', word: 'Broken' },
};

type GaugeDef = {
  id: ConstraintId;
  icon: string;
  label: string;
  value: (b: Budget) => string;
  fill: (b: Budget) => number; // 0..1+
  kind: 'use' | 'goal';
  watch: (b: Budget) => number[]; // numbers that make this gauge pulse when they change
};

const GAUGES: GaugeDef[] = [
  { id: 'mass', icon: '⚖️', label: 'Mass', kind: 'use', value: (b) => `${fmt(b.massKg)} / ${fmt(b.capacityKg)} kg`, fill: (b) => (b.capacityKg ? b.massKg / b.capacityKg : 1.2), watch: (b) => [b.massKg, b.capacityKg] },
  { id: 'power', icon: '⚡', label: 'Power', kind: 'use', value: (b) => `${fmt(b.powerUseW)} / ${fmt(b.powerGenW)} W`, fill: (b) => (b.powerGenW ? b.powerUseW / b.powerGenW : 1.2), watch: (b) => [b.powerUseW, b.powerGenW] },
  { id: 'battery', icon: '🔋', label: 'Battery', kind: 'use', value: (b) => (b.batteryNeedWh ? `${fmt(b.batteryNeedWh)} / ${fmt(b.batteryUsableWh)} Wh` : 'No eclipse'), fill: (b) => (b.batteryUsableWh ? b.batteryNeedWh / b.batteryUsableWh : 1.2), watch: (b) => [b.batteryNeedWh, b.batteryUsableWh] },
  { id: 'budget', icon: '💰', label: 'Budget', kind: 'use', value: (b) => `$${fmt(b.costM)} / ${fmt(b.budgetCapM)}M`, fill: (b) => b.costM / b.budgetCapM, watch: (b) => [b.costM] },
  { id: 'data', icon: '📡', label: 'Data', kind: 'use', value: (b) => `${fmt(b.dataGBPerDay, 2)} / ${fmt(b.downlinkGBPerDay, 2)} GB/day`, fill: (b) => (b.downlinkGBPerDay ? b.dataGBPerDay / b.downlinkGBPerDay : b.dataGBPerDay ? 1.2 : 0), watch: (b) => [b.dataGBPerDay, b.downlinkGBPerDay] },
  { id: 'life', icon: '⏳', label: 'Lifetime', kind: 'goal', value: (b) => `${fmt(b.lifeYears)} yr (need ${b.requiredLifeYears})`, fill: (b) => b.lifeYears / b.requiredLifeYears, watch: (b) => [b.lifeYears] },
  { id: 'science', icon: '🔬', label: 'Science', kind: 'goal', value: (b) => `${fmt(b.science)} (need ${fmt(b.minScience)})`, fill: (b) => (b.minScience ? b.science / b.minScience : 1), watch: (b) => [b.science] },
];

const REQS: ConstraintId[] = ['instrumentType', 'slots', 'reach'];

type Delta = { label: string; text: string; good: boolean };

function deltas(prev: Budget, now: Budget): Delta[] {
  const rows: [string, number, number, string, boolean][] = [
    // label, before, after, unit, is "more" good?
    ['Mass', prev.massKg, now.massKg, 'kg', false],
    ['Power use', prev.powerUseW, now.powerUseW, 'W', false],
    ['Power made', prev.powerGenW, now.powerGenW, 'W', true],
    ['Cost', prev.costM, now.costM, '$M', false],
    ['Data', prev.dataGBPerDay, now.dataGBPerDay, 'GB/day', false],
    ['Downlink', prev.downlinkGBPerDay, now.downlinkGBPerDay, 'GB/day', true],
    ['Lifetime', prev.lifeYears, now.lifeYears, 'yr', true],
    ['Science', prev.science, now.science, '', true],
  ];
  return rows
    .filter(([, a, b]) => Math.abs(b - a) > 1e-6)
    .map(([label, a, b, unit, moreGood]) => {
      const d = b - a;
      const amount = unit === '$M' ? `$${fmt(Math.abs(d), 2)}M` : `${fmt(Math.abs(d), 2)}${unit ? ' ' + unit : ''}`;
      return { label, text: `${d > 0 ? '+' : '−'}${amount} ${label.toLowerCase()}`, good: d > 0 === moreGood };
    });
}

export function Dashboard() {
  const { state } = useGame();
  const design = state.design!;
  const b = computeBudget(design, state.catalog);
  const checks = checkConstraints(design, state.catalog, b);
  const byId = (id: ConstraintId) => checks.find((c) => c.id === id)!;
  const change = state.lastChange;
  const ds = change ? deltas(change.prev, b) : [];
  const broken = checks.filter((c) => c.status === 'fail').length;

  return (
    <aside className="panel dashboard" aria-label="Mission resources">
      <div className="dash-head">
        <h2>Mission resources</h2>
        <span className={`summary ${broken ? 'fail' : 'ok'}`} role="status">
          {broken ? `${broken} problem${broken > 1 ? 's' : ''}` : 'All green'}
        </span>
      </div>

      <ul className="gauges">
        {GAUGES.map((g) => {
          const c = byId(g.id);
          const changed = change && g.watch(change.prev).some((v, i) => Math.abs(v - g.watch(b)[i]) > 1e-6);
          return (
            <Gauge key={g.id + (changed ? `-${change.id}` : '')} def={g} b={b} c={c} pulse={Boolean(changed)} />
          );
        })}
      </ul>

      <ul className="req-list" aria-label="Mission requirements">
        {REQS.map((id) => {
          const c = byId(id);
          return (
            <li key={id} className={`req ${c.status}`} title={c.message}>
              <span className="status-icon" aria-hidden="true">
                {STATUS_TEXT[c.status].icon}
              </span>
              {c.label}
              <span className="sr-only">: {STATUS_TEXT[c.status].word}. {c.message}</span>
            </li>
          );
        })}
      </ul>

      <div className="ripple" aria-live="polite">
        {change && ds.length > 0 && (
          <>
            <p className="ripple-title">
              Because of <strong>{change.label}</strong>:
            </p>
            <ul className="chips" key={change.id}>
              {ds.slice(0, 5).map((d) => (
                <li key={d.label} className={`chip ${d.good ? 'good' : 'bad'}`}>
                  {d.text}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <details className="howto">
        <summary>How are these calculated?</summary>
        <ul className="small muted">
          <li><b>Mass</b>: all parts added up must fit the rocket's capacity to your orbit.</li>
          <li><b>Power</b>: panel power × share of time in sunlight × sunlight strength. Keep 10% spare, because panels age about 3% per year.</li>
          <li><b>Battery</b>: half the battery (we never drain it fully) must power everything through the longest shadow.</li>
          <li><b>Budget</b>: parts + rocket + operations each year of the mission.</li>
          <li><b>Data</b>: what instruments make per day must be ≤ what the radio sends per day. Farther away = slower.</li>
          <li><b>Lifetime</b>: the weakest link: orbit decay, battery wear, or the shortest-lived part.</li>
          <li><b>Science</b>: instrument value × how well the orbit suits the goal (half value if pointing is too rough).</li>
        </ul>
      </details>
    </aside>
  );
}

function Gauge({ def, b, c, pulse }: { def: GaugeDef; b: Budget; c: Constraint; pulse: boolean }) {
  const fill = Math.max(0, Math.min(1, def.fill(b)));
  const st = STATUS_TEXT[c.status];
  return (
    <li className={`gauge ${c.status} ${pulse ? 'pulse' : ''}`} title={c.message}>
      <div className="gauge-top">
        <span className="gauge-label">
          <span aria-hidden="true">{def.icon}</span> {def.label}
        </span>
        <span className={`badge ${c.status}`}>
          <span aria-hidden="true">{st.icon}</span> {st.word}
        </span>
      </div>
      <div
        className="bar"
        role="meter"
        aria-label={`${def.label}: ${def.value(b)}, ${st.word}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(fill * 100)}
      >
        <div className={`bar-fill ${def.kind}`} style={{ width: `${fill * 100}%` }} />
      </div>
      <div className="gauge-value mono">{def.value(b)}</div>
    </li>
  );
}
