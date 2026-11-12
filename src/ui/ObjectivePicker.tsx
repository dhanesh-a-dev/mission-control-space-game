import { fmt } from '../engine';
import { useGame } from './state';

export function ObjectivePicker() {
  const { state, dispatch } = useGame();
  const { catalog } = state;
  const orbitName = (id: string) => catalog.orbits.find((o) => o.id === id)?.name ?? id;
  return (
    <section className="page">
      <h2>Choose your mission</h2>
      <p className="muted">Every mission starts with a goal. The goal decides where you go and what you must carry.</p>
      <div className="objective-grid">
        {catalog.objectives.map((ob) => (
          <article key={ob.id} className="panel objective-card">
            <div className="objective-head">
              <span className="objective-icon" aria-hidden="true">
                {ob.icon}
              </span>
              <span className={`pill pill-${ob.difficulty.toLowerCase()}`}>{ob.difficulty}</span>
            </div>
            <h3>{ob.name}</h3>
            <p className="tagline">{ob.tagline}</p>
            <p className="muted small">{ob.description}</p>
            <dl className="reqs">
              <div>
                <dt>Budget cap</dt>
                <dd className="mono">${fmt(ob.budgetCapM)}M</dd>
              </div>
              <div>
                <dt>Must last</dt>
                <dd className="mono">{ob.minLifeYears} yr</dd>
              </div>
              <div>
                <dt>Science needed</dt>
                <dd className="mono">{ob.minScience}</dd>
              </div>
              <div>
                <dt>Destination</dt>
                <dd>{ob.allowedOrbits.map(orbitName).join(' / ')}</dd>
              </div>
              <div className="wide">
                <dt>Needs one of</dt>
                <dd>{ob.requiredInstrumentTypes.join(', ')} instrument</dd>
              </div>
            </dl>
            <button className="btn btn-primary" onClick={() => dispatch({ type: 'pickObjective', id: ob.id })}>
              Plan {ob.name} <span aria-hidden="true">→</span>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
