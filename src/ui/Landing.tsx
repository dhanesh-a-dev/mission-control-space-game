import { useGame } from './state';

export function Landing() {
  const { dispatch } = useGame();
  return (
    <section className="landing">
      <p className="eyebrow">A space mission design game</p>
      <h1>
        Design a space mission. Launch it. <span className="accent">Find out why it worked or failed.</span>
      </h1>
      <p className="lede">
        Every part you add changes the mass, power, data and budget. Balance them like a real mission team, then watch your
        spacecraft fly.
      </p>
      <button className="btn btn-primary btn-big" onClick={() => dispatch({ type: 'go', screen: 'objectives' })}>
        Start a Mission <span aria-hidden="true">→</span>
      </button>
      <ol className="steps-strip" aria-label="How it works">
        <li>
          <span className="step-num">1</span>
          <strong>Choose an objective</strong>
          <span>Wildfires, solar storms or Mars</span>
        </li>
        <li>
          <span className="step-num">2</span>
          <strong>Build your spacecraft</strong>
          <span>Parts, instruments, rocket, orbit</span>
        </li>
        <li>
          <span className="step-num">3</span>
          <strong>Fly the mission</strong>
          <span>See what breaks, and why</span>
        </li>
      </ol>
    </section>
  );
}
