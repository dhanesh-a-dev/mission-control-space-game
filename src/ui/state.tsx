/**
 * Game state: one reducer holds everything (which screen, the current design,
 * settings). React components send "actions" like { type: 'setPart' }.
 */
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import type { Catalog, Category } from '../data/schema';
import { computeBudget, starterDesign, type Budget, type Design } from '../engine';

export type Screen = 'landing' | 'objectives' | 'build' | 'fly';

export type State = {
  screen: Screen;
  catalog: Catalog;
  design: Design | null;
  eventsOn: boolean;
  seed: number;
  flights: number;
  /** what changed last, so the dashboard can show "because of …" */
  lastChange: { label: string; prev: Budget; id: number } | null;
};

export type Action =
  | { type: 'go'; screen: Screen }
  | { type: 'pickObjective'; id: string }
  | { type: 'setPart'; category: Category; id: string }
  | { type: 'toggleInstrument'; id: string }
  | { type: 'setLauncher'; id: string }
  | { type: 'setOrbit'; id: string }
  | { type: 'applyDesign'; design: Design; label: string }
  | { type: 'toggleEvents' }
  | { type: 'fly' };

function withChange(state: State, design: Design, label: string): State {
  const prev = computeBudget(state.design!, state.catalog);
  return { ...state, design, lastChange: { label, prev, id: (state.lastChange?.id ?? 0) + 1 } };
}

function reducer(state: State, a: Action): State {
  const c = state.catalog;
  const d = state.design;
  switch (a.type) {
    case 'go':
      return { ...state, screen: a.screen };
    case 'pickObjective':
      return { ...state, design: starterDesign(c, a.id), screen: 'build', lastChange: null };
    case 'setPart': {
      if (!d) return state;
      const part = c.components.find((x) => x.id === a.id);
      return withChange(state, { ...d, parts: { ...d.parts, [a.category]: a.id } }, part?.name ?? a.id);
    }
    case 'toggleInstrument': {
      if (!d) return state;
      const inst = c.instruments.find((x) => x.id === a.id);
      const has = d.instrumentIds.includes(a.id);
      const instrumentIds = has ? d.instrumentIds.filter((x) => x !== a.id) : [...d.instrumentIds, a.id];
      return withChange(state, { ...d, instrumentIds }, `${has ? 'removing' : 'adding'} ${inst?.name ?? a.id}`);
    }
    case 'setLauncher':
      if (!d) return state;
      return withChange(state, { ...d, launcherId: a.id }, c.launchVehicles.find((x) => x.id === a.id)?.name ?? a.id);
    case 'setOrbit':
      if (!d) return state;
      return withChange(state, { ...d, orbitId: a.id }, c.orbits.find((x) => x.id === a.id)?.name ?? a.id);
    case 'applyDesign':
      if (!d) return state;
      return { ...withChange(state, a.design, a.label), screen: 'build' };
    case 'toggleEvents':
      return { ...state, eventsOn: !state.eventsOn };
    case 'fly':
      return { ...state, screen: 'fly', flights: state.flights + 1, seed: Math.floor(Math.random() * 1e9) };
  }
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

export function GameProvider({ catalog, children }: { catalog: Catalog; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    screen: 'landing',
    catalog,
    design: null,
    eventsOn: false,
    seed: 1,
    flights: 0,
    lastChange: null,
  });
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useGame() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame must be used inside <GameProvider>');
  return v;
}
