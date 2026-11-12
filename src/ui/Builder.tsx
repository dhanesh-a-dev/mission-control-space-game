import { CATEGORIES, CATEGORY_LABELS, type Component } from '../data/schema';
import { computeBudget, checkConstraints, fmt } from '../engine';
import { Dashboard } from './Dashboard';
import { BuilderVisual } from './three/View3D';
import { spacecraftVisual } from './three/visuals';
import { useGame } from './state';

const POINTING = ['', 'rough', 'good', 'precise'];

function componentStats(c: Component): string[] {
  const s: string[] = [`${fmt(c.massKg)} kg`];
  if (c.powerGenW !== undefined) s.push(`makes ${fmt(c.powerGenW)} W`);
  else if (c.powerW) s.push(`uses ${fmt(c.powerW)} W`);
  s.push(`$${fmt(c.costM, 2)}M`);
  if (c.instrumentSlots !== undefined) s.push(`${c.instrumentSlots} slot${c.instrumentSlots === 1 ? '' : 's'}`);
  if (c.batteryWh !== undefined) s.push(`${fmt(c.batteryWh)} Wh`);
  if (c.downlinkGBPerDay !== undefined) s.push(`${fmt(c.downlinkGBPerDay, 2)} GB/day`);
  if (c.storageGB !== undefined) s.push(`${fmt(c.storageGB)} GB${c.dataCompression && c.dataCompression < 1 ? ' · ½ data' : ''}`);
  if (c.pointing !== undefined) s.push(`${POINTING[c.pointing]} pointing`);
  s.push(`${fmt(c.lifeYears)} yr life`);
  return s;
}

export function Builder() {
  const { state, dispatch } = useGame();
  const { catalog } = state;
  const design = state.design!;
  const objective = catalog.objectives.find((o) => o.id === design.objectiveId)!;
  const b = computeBudget(design, catalog);
  const checks = checkConstraints(design, catalog, b);
  const broken = checks.filter((c) => c.status === 'fail').length;
  const slotsFull = b.instrumentCount >= b.instrumentSlots;
  const orbit = catalog.orbits.find((o) => o.id === design.orbitId);

  return (
    <section className="page builder">
      <div className="mission-bar panel">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true">{objective.icon}</span> Mission: {objective.name}
          </p>
          <p className="muted small">{objective.tagline}. Needs a {objective.requiredInstrumentTypes.join(' / ')} instrument, ${fmt(objective.budgetCapM)}M max, {objective.minLifeYears}+ years.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => dispatch({ type: 'go', screen: 'objectives' })}>
          Change mission
        </button>
      </div>

      <div className="builder-grid">
        <div className="builder-main">
          <section aria-labelledby="sec-sc">
            <h2 id="sec-sc">
              <span className="step-num">1</span> Build the spacecraft
            </h2>
            {CATEGORIES.map((cat) => (
              <fieldset key={cat} className="group">
                <legend>
                  {CATEGORY_LABELS[cat].label}
                  <span className="legend-help">{CATEGORY_LABELS[cat].help}</span>
                </legend>
                <div className="options">
                  {catalog.components
                    .filter((c) => c.category === cat)
                    .map((c) => (
                      <label key={c.id} className={`option ${design.parts[cat] === c.id ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          className="sr-only"
                          name={cat}
                          checked={design.parts[cat] === c.id}
                          onChange={() => dispatch({ type: 'setPart', category: cat, id: c.id })}
                        />
                        <span className="option-name">{c.name}</span>
                        <span className="option-desc">{c.description}</span>
                        <span className="option-stats mono">{componentStats(c).join(' · ')}</span>
                      </label>
                    ))}
                </div>
              </fieldset>
            ))}
          </section>

          <section aria-labelledby="sec-inst">
            <h2 id="sec-inst">
              <span className="step-num">2</span> Pick instruments{' '}
              <span className="count mono">
                {b.instrumentCount}/{b.instrumentSlots} slots
              </span>
            </h2>
            <p className="muted small">
              Instruments are why you fly. Each adds science, and also mass, power, cost and data. This mission needs at least one{' '}
              <b>{objective.requiredInstrumentTypes.join(' / ')}</b> instrument.
            </p>
            <div className="options">
              {catalog.instruments.map((i) => {
                const on = design.instrumentIds.includes(i.id);
                const disabled = !on && slotsFull;
                const fits = objective.requiredInstrumentTypes.includes(i.type);
                return (
                  <label key={i.id} className={`option ${on ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      disabled={disabled}
                      onChange={() => dispatch({ type: 'toggleInstrument', id: i.id })}
                    />
                    <span className="option-name">
                      {i.name} {fits && <span className="pill pill-fit">fits goal</span>}
                    </span>
                    <span className="option-desc">{i.description}</span>
                    <span className="option-stats mono">
                      {fmt(i.massKg)} kg · uses {fmt(i.powerW)} W · ${fmt(i.costM, 2)}M · {fmt(i.dataGBPerDay, 2)} GB/day · science {i.science} ·
                      needs {POINTING[i.minPointing]} pointing
                    </span>
                    {disabled && <span className="option-note">No free slot. Pick a bigger bus or remove one.</span>}
                  </label>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="sec-launch">
            <h2 id="sec-launch">
              <span className="step-num">3</span> Choose orbit & rocket
            </h2>
            <fieldset className="group">
              <legend>
                Orbit / destination
                <span className="legend-help">Where your spacecraft works. It changes sunlight, shadows, data speed, lifetime and cost.</span>
              </legend>
              <div className="options">
                {objective.allowedOrbits.map((oid) => {
                  const o = catalog.orbits.find((x) => x.id === oid);
                  if (!o) return null;
                  return (
                    <label key={o.id} className={`option ${design.orbitId === o.id ? 'selected' : ''}`}>
                      <input type="radio" className="sr-only" name="orbit" checked={design.orbitId === o.id} onChange={() => dispatch({ type: 'setOrbit', id: o.id })} />
                      <span className="option-name">
                        {o.name} <span className="muted small">{o.altitudeLabel}</span>
                      </span>
                      <span className="option-desc">{o.description}</span>
                      <span className="option-stats mono">
                        {Math.round(o.sunlightFraction * o.solarFactor * 100)}% solar power · {o.eclipseMinutes} min shadow · data ×{o.contactFactor} ·
                        max {fmt(o.maxLifeYears)} yr · ops ${fmt(o.opsCostPerYearM)}M/yr · science ×{objective.orbitFit[o.id] ?? 0}
                        {o.transferMonths ? ` · ${o.transferMonths} mo cruise` : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <fieldset className="group">
              <legend>
                Launch vehicle
                <span className="legend-help">The rocket. Each one can only lift so much to each orbit{orbit ? `. Capacities below are for ${orbit.name}` : ''}.</span>
              </legend>
              <div className="options">
                {catalog.launchVehicles.map((lv) => {
                  const cap = design.orbitId ? (lv.capacityKg[design.orbitId] ?? 0) : 0;
                  return (
                    <label key={lv.id} className={`option ${design.launcherId === lv.id ? 'selected' : ''}`}>
                      <input type="radio" className="sr-only" name="launcher" checked={design.launcherId === lv.id} onChange={() => dispatch({ type: 'setLauncher', id: lv.id })} />
                      <span className="option-name">{lv.name}</span>
                      <span className="option-desc">{lv.description}</span>
                      <span className="option-stats mono">
                        ${fmt(lv.costM)}M · {cap > 0 ? `carries ${fmt(cap)} kg here` : <span className="text-fail">can't reach this orbit</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>
        </div>

        <div className="builder-side">
          <BuilderVisual
            v={spacecraftVisual(design, catalog)}
            powered={checks.find((c) => c.id === 'power')?.status !== 'fail'}
            caption={`Your spacecraft · ${fmt(b.massKg)} kg · ${b.instrumentCount} instrument${b.instrumentCount === 1 ? '' : 's'}`}
          />
          <Dashboard />
          <div className="panel launch-panel">
            <label className="toggle">
              <input type="checkbox" checked={state.eventsOn} onChange={() => dispatch({ type: 'toggleEvents' })} />
              <span>
                Random events <span className="muted small">(solar flares, outages…)</span>
              </span>
            </label>
            <button className="btn btn-primary btn-big btn-block" onClick={() => dispatch({ type: 'fly' })}>
              <span aria-hidden="true">🚀</span> Fly the Mission
            </button>
            <p className="muted small center">
              {broken ? 'Red gauges? Fly anyway and find out exactly what breaks.' : 'Looking good. Time to find out for real.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
