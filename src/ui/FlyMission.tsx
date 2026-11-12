/**
 * SIGNATURE FEATURE: Fly the Mission.
 * Runs the simulation once, then reveals the timeline step by step like a live
 * mission feed. Stops at the first failure and explains why, with fixes the
 * player can apply in one tap.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { simulateMission } from '../engine';
import { STATUS_TEXT } from './Dashboard';
import { useGame } from './state';
import { MissionVisual } from './three/View3D';
import { sceneFor, spacecraftVisual } from './three/visuals';
import type { SceneMode } from './three/MissionScene';

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function FlyMission() {
  const { state, dispatch } = useGame();
  const { catalog } = state;
  const design = state.design!;
  const objective = catalog.objectives.find((o) => o.id === design.objectiveId)!;
  const sim = useMemo(() => simulateMission(design, catalog, { events: state.eventsOn, seed: state.seed }), [design, catalog, state.eventsOn, state.seed]);

  const [shown, setShown] = useState(() => (prefersReducedMotion() ? sim.steps.length : 0));
  const done = shown >= sim.steps.length;
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : 900);
    return () => clearTimeout(t);
  }, [shown, done]);

  useEffect(() => {
    if (done) resultRef.current?.focus({ preventScroll: true });
    if (done) resultRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }, [done]);

  const current = sim.steps[Math.max(0, shown - 1)];
  const pos = shown === 0 ? 0 : current.progress;
  const failedNow = done && sim.outcome === 'failure';

  // what the 3D scene should show for the step on screen
  const visual = useMemo(() => spacecraftVisual(design, catalog), [design, catalog]);
  const scene = sceneFor(catalog.orbits.find((o) => o.id === design.orbitId));
  const isFail = shown > 0 && current.status === 'fail';
  let mode: SceneMode = 'assembly';
  if (shown > 0) {
    if (current.phase === 'review') mode = isFail ? 'cancelled' : 'assembly';
    else if (current.phase === 'launch') mode = isFail ? 'explode' : 'launch';
    else if (current.phase === 'cruise') mode = 'cruise';
    else if (current.phase === 'ops') mode = isFail ? 'tumble' : 'orbit';
    else mode = 'success';
  }
  const powerFailure =
    isFail && (['power', 'battery'].includes(sim.failure?.constraintId ?? '') || ['power', 'solar', 'battery'].includes(current.event?.kind ?? '') || /power/i.test(current.title));
  const sceneCaption = shown === 0 ? 'Ready on the pad' : `${current.when} · ${current.title}`;

  return (
    <section className="page fly">
      <div className="fly-head">
        <div>
          <p className="eyebrow">
            Flight {state.flights} · {objective.icon} {objective.name}
            {state.eventsOn ? ' · random events ON' : ''}
          </p>
          <h2>{done ? (sim.outcome === 'success' ? 'Mission accomplished' : 'Mission lost') : 'Mission in progress…'}</h2>
        </div>
        {!done && (
          <button className="btn btn-ghost" onClick={() => setShown(sim.steps.length)}>
            Skip to result
          </button>
        )}
      </div>

      <MissionVisual v={visual} scene={scene} mode={mode} powered={!powerFailure} caption={sceneCaption} />

      <div className="track panel" aria-hidden="true">
        <div className="track-line">
          <div className={`track-fill ${failedNow ? 'fail' : ''}`} style={{ width: `${pos * 100}%` }} />
          <span className={`track-craft ${failedNow ? 'fail' : ''}`} style={{ left: `${pos * 100}%` }}>
            {failedNow ? '💥' : shown === 0 ? '🚀' : current.phase === 'review' ? '🛠️' : '🛰️'}
          </span>
        </div>
        <div className="track-labels">
          <span>Review</span>
          <span>Launch</span>
          <span>Operations</span>
          <span>End of mission</span>
        </div>
      </div>

      <ol className="timeline" aria-live="polite">
        {sim.steps.slice(0, shown).map((s, i) => (
          <li key={i} className={`tl-step ${s.status} ${s.event ? 'event' : ''}`}>
            <span className={`tl-dot ${s.status}`} aria-hidden="true">
              {STATUS_TEXT[s.status].icon}
            </span>
            <div className="tl-body">
              <span className="tl-when mono">{s.when}</span>
              <h3 className="tl-title">
                {s.title}
                <span className="sr-only"> ({STATUS_TEXT[s.status].word})</span>
              </h3>
              <p className="tl-detail">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      {done && (
        <div ref={resultRef} tabIndex={-1} className={`panel result ${sim.outcome}`}>
          {sim.failure ? (
            <>
              <p className="eyebrow text-fail">
                <span aria-hidden="true">✕</span> Post-mortem · failed at {sim.steps.at(-1)?.when}
              </p>
              <h3>{sim.failure.headline}</h3>
              <p className="why">{sim.failure.why}</p>
              {sim.failure.fixes.length > 0 && (
                <>
                  <h4>How to fix it</h4>
                  <ul className="fixes">
                    {sim.failure.fixes.map((f, i) => (
                      <li key={i}>
                        <span>{f.text}</span>
                        <button className="btn btn-small" onClick={() => dispatch({ type: 'applyDesign', design: f.design, label: 'the suggested fix' })}>
                          Apply & edit
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="rule">
                <span aria-hidden="true">💡</span> <b>Rule of thumb:</b> {sim.failure.ruleOfThumb}
              </p>
              <p className="muted small">Score: {sim.score.total}/100 for getting {Math.round((sim.steps.at(-1)?.progress ?? 0) * 100)}% of the way.</p>
            </>
          ) : (
            <>
              <div className="score-row">
                <div className="score-circle" aria-label={`Score ${sim.score.total} out of 100`}>
                  <span className="mono">{sim.score.total}</span>
                  <small>/100</small>
                </div>
                <div>
                  <p className="eyebrow text-ok">
                    <span aria-hidden="true">✓</span> Success report
                  </p>
                  <h3>{sim.score.grade}</h3>
                  <p className="muted small">Points come from science and from keeping spare margins, like a real mission team.</p>
                </div>
              </div>
              <ul className="breakdown">
                {sim.score.parts.map((p) => (
                  <li key={p.label}>
                    <div className="bd-top">
                      <span>{p.label}</span>
                      <span className="mono">
                        {p.points}/{p.max}
                      </span>
                    </div>
                    <div className="bar" aria-hidden="true">
                      <div className="bar-fill goal" style={{ width: `${(p.points / p.max) * 100}%` }} />
                    </div>
                    <span className="muted small">{p.why}</span>
                  </li>
                ))}
              </ul>
              {!state.eventsOn && <p className="rule"><span aria-hidden="true">💡</span> <b>Challenge:</b> turn on random events and see if your margins survive surprises.</p>}
            </>
          )}
          <div className="result-actions">
            <button className="btn btn-primary" onClick={() => dispatch({ type: 'go', screen: 'build' })}>
              <span aria-hidden="true">🛠️</span> Back to design
            </button>
            <button className="btn btn-ghost" onClick={() => dispatch({ type: 'fly' })}>
              <span aria-hidden="true">🔁</span> Fly again
            </button>
            <button className="btn btn-ghost" onClick={() => dispatch({ type: 'go', screen: 'objectives' })}>
              New mission
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
