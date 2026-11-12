/**
 * Fly the Mission in 3D. The scene follows the timeline step that is showing:
 *  review → your spacecraft on display · launch → rocket climbs · cruise → travel
 *  ops → orbiting the planet · failure → explosion / tumbling with dead panels
 *  success → orbiting with a green trail.
 */
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Spacecraft, spacecraftSpan } from './Spacecraft';
import { prefersReducedMotion, type SceneKind, type SpacecraftVisual } from './visuals';

export type SceneMode = 'assembly' | 'launch' | 'cruise' | 'orbit' | 'success' | 'cancelled' | 'explode' | 'tumble';

type Props = {
  v: SpacecraftVisual;
  scene: { kind: SceneKind; radius: number; speed: number };
  mode: SceneMode;
  powered: boolean;
};

/* ---------- Planet with simple painted continents (no image files needed) ---------- */
function Planet({ kind, radius }: { kind: 'earth' | 'mars'; radius: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(radius, 96, 64);
    const pos = g.attributes.position;
    const colors: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / radius, y = pos.getY(i) / radius, z = pos.getZ(i) / radius;
      const n = Math.sin(2.1 * x + 1.3) * Math.cos(1.7 * y - 0.4) + 0.6 * Math.sin(3.3 * z + 0.7) + 0.25 * Math.sin(5 * x + 4 * z) + 0.15 * Math.cos(9 * y + 3 * x);
      if (kind === 'earth') {
        if (Math.abs(y) > 0.88) c.set('#eef4ff');
        else if (n > 0.45) c.set(n > 0.9 ? '#8a6d3b' : '#3f7d3a');
        else c.set('#1b4fb5').offsetHSL(0, 0, n * 0.06);
      } else {
        if (Math.abs(y) > 0.9) c.set('#f3ece6');
        else c.set(n > 0.3 ? '#7c2d12' : '#c2541f').offsetHSL(0, 0, n * 0.05);
      }
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, [kind, radius]);
  useFrame((_, dt) => {
    if (ref.current && !prefersReducedMotion()) ref.current.rotation.y += dt * 0.05;
  });
  const atmo = kind === 'earth' ? '#60a5fa' : '#fb923c';
  return (
    <group>
      <mesh ref={ref} geometry={geo} rotation={[0.3, 0, 0.1]}>
        <meshStandardMaterial vertexColors roughness={0.85} metalness={0} />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshBasicMaterial color={atmo} transparent opacity={kind === 'earth' ? 0.13 : 0.08} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function Sun({ position, size }: { position: [number, number, number]; size: number }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial color="#ffd27a" />
      </mesh>
      <mesh scale={1.5}>
        <sphereGeometry args={[size, 32, 32]} />
        <meshBasicMaterial color="#ffb347" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}

function Rocket() {
  const flame = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (flame.current) flame.current.scale.y = 1 + 0.35 * Math.sin(clock.elapsedTime * 40);
  });
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.07, 0.07, 0.5, 16]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.33, 0]}>
        <coneGeometry args={[0.07, 0.16, 16]} />
        <meshStandardMaterial color="#4c8dff" />
      </mesh>
      <mesh ref={flame} position={[0, -0.36, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.06, 0.25, 12]} />
        <meshBasicMaterial color="#ff9b3d" />
      </mesh>
      <pointLight position={[0, -0.4, 0]} color="#ff9b3d" intensity={3} distance={2} />
    </group>
  );
}

const deepScale = (k: SceneKind) => (k === 'deep' ? 2.2 : 0.9);

/* ---------- The director: moves things depending on the mission mode ---------- */
function Director({ v, scene, mode, powered }: Props) {
  const craft = useRef<THREE.Group>(null);
  const rocket = useRef<THREE.Group>(null);
  const boom = useRef<THREE.Mesh>(null);
  const alarm = useRef<THREE.PointLight>(null);
  const modeStart = useRef({ mode, t: 0 });
  const angle = useRef(0);
  const still = prefersReducedMotion();
  const fit = (deepScale(scene.kind)) / spacecraftSpan(v);

  const deep = scene.kind === 'deep';
  const planetPos = deep ? new THREE.Vector3(-4.2, -0.4, -2) : new THREE.Vector3(0, 0, 0);
  const planetR = deep ? 0.7 : 1.5;
  const orbitR = deep ? 0 : scene.radius;

  useFrame(({ clock }, dt) => {
    const now = clock.elapsedTime;
    if (modeStart.current.mode !== mode) modeStart.current = { mode, t: now };
    const t = still ? 10 : now - modeStart.current.t; // time in this mode
    const c = craft.current;
    const r = rocket.current;
    if (!c || !r) return;

    // where the spacecraft sits in orbit right now
    if (!still && (mode === 'orbit' || mode === 'success')) angle.current += dt * scene.speed;
    const orbitPos = deep
      ? new THREE.Vector3(0.6, 0.15 * Math.sin(now * 0.6), 0)
      : new THREE.Vector3(Math.cos(angle.current) * orbitR, Math.sin(angle.current) * orbitR * 0.28, Math.sin(angle.current) * orbitR);

    const CLIMB = 1.0; // seconds a doomed rocket climbs before it fails
    r.visible = mode === 'launch' || (mode === 'explode' && t < CLIMB);
    c.visible = mode !== 'launch' && mode !== 'explode';
    if (boom.current) boom.current.visible = mode === 'explode' && t >= CLIMB;
    if (alarm.current) alarm.current.intensity = mode === 'tumble' || mode === 'explode' ? 4 + 4 * Math.sin(now * 12) : 0;

    switch (mode) {
      case 'assembly':
      case 'cancelled': {
        c.position.set(0, 0.1, 3.6);
        c.scale.setScalar(fit * 2.6);
        c.rotation.set(0.2, now * (still ? 0 : 0.6), 0);
        break;
      }
      case 'launch': {
        const k = Math.min(1, t / 1.6);
        const start = planetPos.clone().add(new THREE.Vector3(0, planetR, 0.2));
        const end = deep ? new THREE.Vector3(0.6, 0, 0) : new THREE.Vector3(orbitR * 0.7, orbitR * 0.6, orbitR * 0.3);
        r.position.lerpVectors(start, end, k * k);
        r.rotation.set(0, 0, deep ? -1.2 : -0.6 * k);
        angle.current = Math.atan2(end.z, end.x);
        break;
      }
      case 'cruise': {
        const k = Math.min(1, t / 1.6);
        c.position.lerpVectors(new THREE.Vector3(-7, 2, 2), orbitPos, 1 - Math.pow(1 - k, 3));
        c.scale.setScalar(fit);
        c.rotation.set(0, now * 0.3, 0);
        break;
      }
      case 'orbit':
      case 'success': {
        c.position.copy(orbitPos);
        c.scale.setScalar(fit);
        if (deep) c.rotation.set(0.25, 0.6 + (still ? 0 : now * 0.25), 0);
        else c.rotation.set(0.1, -angle.current + Math.PI / 2, 0);
        break;
      }
      case 'tumble': {
        // drift away from orbit, spinning out of control
        c.position.copy(orbitPos).addScaledVector(orbitPos.clone().normalize().add(new THREE.Vector3(0, 0.3, 0.4)), Math.min(t, 6) * 0.25);
        c.scale.setScalar(fit);
        c.rotation.set(t * 1.7, t * 1.1, t * 0.6);
        break;
      }
      case 'explode': {
        // the rocket struggles upward, then fails
        const start = planetPos.clone().add(new THREE.Vector3(0, planetR, 0.2));
        const climb = Math.min(1, t / CLIMB);
        r.position.copy(start).add(new THREE.Vector3(0.15 * climb, 0.9 * climb, 0.3 * climb));
        r.rotation.set(0, 0, -0.25 * climb + 0.05 * Math.sin(now * 30));
        const k = Math.min(1, Math.max(0, t - CLIMB) / 1.2);
        if (boom.current) {
          boom.current.position.copy(r.position);
          boom.current.scale.setScalar(0.05 + k * 0.9);
          (boom.current.material as THREE.MeshBasicMaterial).opacity = 1 - k;
        }
        break;
      }
    }
  });

  return (
    <>
      {deep ? (
        <>
          <group position={planetPos.toArray()}>
            <Planet kind="earth" radius={planetR} />
          </group>
          <Sun position={[7, 0.5, -3]} size={1.6} />
          <directionalLight position={[7, 0.5, -3]} intensity={2.8} />
        </>
      ) : (
        <>
          <Planet kind={scene.kind === 'mars' ? 'mars' : 'earth'} radius={planetR} />
          <Sun position={[14, 4, -10]} size={scene.kind === 'mars' ? 0.6 : 0.9} />
          <directionalLight position={[8, 3, 2]} intensity={scene.kind === 'mars' ? 1.8 : 2.6} />
          <group rotation={[0.28, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]}>
              <torusGeometry args={[orbitR, 0.006, 6, 128]} />
              <meshBasicMaterial color={mode === 'success' ? '#34d399' : '#4c8dff'} transparent opacity={mode === 'success' ? 0.8 : 0.3} />
            </mesh>
          </group>
        </>
      )}

      <group ref={craft}>
        <Spacecraft v={v} powered={powered} />
        <pointLight color="#ffffff" intensity={1.5} distance={3} />
      </group>
      <group ref={rocket} visible={false}>
        <Rocket />
      </group>
      <mesh ref={boom} visible={false}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#ff8a3d" transparent opacity={1} />
      </mesh>
      <pointLight ref={alarm} color="#f87171" intensity={0} distance={6} position={[0, 2, 3]} />
    </>
  );
}

export default function MissionScene(props: Props) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 1.3, 6.3], fov: 45 }}>
      <color attach="background" args={['#05080f']} />
      <ambientLight intensity={0.22} />
      <directionalLight position={[0, 2, 6]} intensity={0.7} color="#c7d2fe" />
      <Stars radius={60} depth={30} count={2500} factor={3} fade speed={prefersReducedMotion() ? 0 : 0.5} />
      <Director {...props} />
      <OrbitControls enablePan={false} enableZoom={false} />
    </Canvas>
  );
}
