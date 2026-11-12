import { useEffect, useState } from 'react';
import { loadCatalog, type LoadResult } from './data/adapter';
import { GameProvider, useGame } from './ui/state';
import { Landing } from './ui/Landing';
import { ObjectivePicker } from './ui/ObjectivePicker';
import { Builder } from './ui/Builder';
import { FlyMission } from './ui/FlyMission';

function Screens({ usingFallback }: { usingFallback: boolean }) {
  const { state, dispatch } = useGame();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.screen]);
  return (
    <>
      <header className="topbar">
        <button className="brand" onClick={() => dispatch({ type: 'go', screen: 'landing' })} aria-label="Mission Control home">
          <span aria-hidden="true">🛰️</span> Mission Control
        </button>
        {usingFallback && (
          <span className="offline-note" role="status">
            Using offline data
          </span>
        )}
      </header>
      <main id="main">
        {state.screen === 'landing' && <Landing />}
        {state.screen === 'objectives' && <ObjectivePicker />}
        {state.screen === 'build' && state.design && <Builder />}
        {state.screen === 'fly' && state.design && <FlyMission key={state.flights} />}
      </main>
      <footer className="footer">
        Data inspired by NASA public references (simplified for learning). Not affiliated with or endorsed by NASA.
      </footer>
    </>
  );
}

export default function App() {
  const [data, setData] = useState<LoadResult | null>(null);
  useEffect(() => {
    loadCatalog().then((r) => {
      if (r.problems.length) console.warn('Catalog problems, using fallback:', r.problems);
      setData(r);
    });
  }, []);
  if (!data) return <p className="loading">Loading mission catalog…</p>;
  return (
    <GameProvider catalog={data.catalog}>
      <Screens usingFallback={data.usingFallback} />
    </GameProvider>
  );
}
