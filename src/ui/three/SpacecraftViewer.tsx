/** Builder view: your spacecraft, rotating, rebuilt live as you pick parts. */
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Spacecraft, spacecraftSpan } from './Spacecraft';
import { prefersReducedMotion, type SpacecraftVisual } from './visuals';

export default function SpacecraftViewer({ v, powered }: { v: SpacecraftVisual; powered: boolean }) {
  const fit = 3.3 / spacecraftSpan(v); // zoom so wide and narrow spacecraft both fill the view
  const still = prefersReducedMotion();
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [1.8, 1.0, 2.9], fov: 40 }} gl={{ antialias: true }}>
      <color attach="background" args={['#070b17']} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#bcd3ff', '#2a1d10', 0.6]} />
      <directionalLight position={[4, 5, 3]} intensity={2.4} />
      <pointLight position={[-3, -1, -2]} intensity={6} color="#a78bfa" />
      <Stars radius={40} depth={20} count={1200} factor={2.5} fade speed={still ? 0 : 0.6} />
      <group scale={fit} rotation={[0.15, -0.5, 0]}>
        <Spacecraft v={v} powered={powered} />
      </group>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate={!still} autoRotateSpeed={1.4} />
    </Canvas>
  );
}
