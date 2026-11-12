/**
 * Safe wrapper around the 3D views:
 *  - 3D code is loaded lazily (the first screen stays fast)
 *  - no WebGL, a crash, or the user switching 3D off → flat drawing instead
 *  - the choice is remembered on this device
 */
import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import { FlatSpacecraft } from './FlatSpacecraft';
import { hasWebGL, type SceneKind, type SpacecraftVisual } from './visuals';
import type { SceneMode } from './MissionScene';

const SpacecraftViewer = lazy(() => import('./SpacecraftViewer'));
const MissionScene = lazy(() => import('./MissionScene'));

class SafeBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn('3D view failed, showing flat view instead:', err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const KEY = 'mission-control-3d';
function use3D(): [boolean, (on: boolean) => void, boolean] {
  const [supported] = useState(hasWebGL);
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== 'off';
    } catch {
      return true;
    }
  });
  const set = (v: boolean) => {
    setOn(v);
    try {
      localStorage.setItem(KEY, v ? 'on' : 'off');
    } catch {
      /* storage blocked: fine, just don't remember */
    }
  };
  return [supported && on, set, supported];
}

function Toggle({ on, set, supported }: { on: boolean; set: (v: boolean) => void; supported: boolean }) {
  if (!supported) return <span className="view-toggle muted">Flat view (3D not supported)</span>;
  return (
    <button className="view-toggle" onClick={() => set(!on)} aria-pressed={on}>
      {on ? '3D on' : '3D off'}
    </button>
  );
}

export function BuilderVisual({ v, powered, caption }: { v: SpacecraftVisual; powered: boolean; caption: string }) {
  const [on, set, supported] = use3D();
  const flat = <FlatSpacecraft v={v} powered={powered} />;
  return (
    <figure className="panel viz viz-builder">
      <div className="viz-stage">
        {on ? (
          <SafeBoundary fallback={flat}>
            <Suspense fallback={<div className="viz-loading">Loading 3D…</div>}>
              <SpacecraftViewer v={v} powered={powered} />
            </Suspense>
          </SafeBoundary>
        ) : (
          flat
        )}
      </div>
      <figcaption>
        <span>{caption}</span>
        <Toggle on={on} set={set} supported={supported} />
      </figcaption>
    </figure>
  );
}

export function MissionVisual(props: { v: SpacecraftVisual; scene: { kind: SceneKind; radius: number; speed: number }; mode: SceneMode; powered: boolean; caption: string }) {
  const [on, set, supported] = use3D();
  const flat = <FlatSpacecraft v={props.v} powered={props.powered} mode={props.mode} />;
  return (
    <figure className="panel viz viz-mission">
      <div className="viz-stage">
        {on ? (
          <SafeBoundary fallback={flat}>
            <Suspense fallback={<div className="viz-loading">Loading 3D…</div>}>
              <MissionScene v={props.v} scene={props.scene} mode={props.mode} powered={props.powered} />
            </Suspense>
          </SafeBoundary>
        ) : (
          flat
        )}
      </div>
      <figcaption>
        <span>{props.caption}</span>
        <Toggle on={on} set={set} supported={supported} />
      </figcaption>
    </figure>
  );
}
