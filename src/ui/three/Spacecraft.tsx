/**
 * The 3D spacecraft, built only from simple shapes (boxes, cylinders, a dish).
 * New parts "unfold" or "pop in" with a short animation when you pick them.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SpacecraftVisual } from './visuals';

/** Grows from 0 to full size when it first appears (unfold / pop-in effect). */
function Grow({ children, axis = 'all', delay = 0, ...props }: { children: React.ReactNode; axis?: 'x' | 'all'; delay?: number } & React.ComponentProps<'group'>) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(-delay);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    t.current += dt;
    const k = THREE.MathUtils.clamp(t.current / 0.45, 0, 1);
    const e = 1 - Math.pow(1 - k, 3); // ease out
    const s = Math.max(0.001, e);
    if (axis === 'x') g.scale.set(s, 1, 1);
    else g.scale.setScalar(s);
  });
  return (
    <group ref={ref} scale={0.001} {...props}>
      {children}
    </group>
  );
}

/** Rough overall width, used to zoom the camera so any spacecraft fits on screen. */
export function spacecraftSpan(v: SpacecraftVisual): number {
  const panelW = v.bodyH * 0.72;
  return Math.max(v.bodyW + 2 * (0.12 + v.panelsPerWing * (panelW + 0.03)), v.bodyH * 1.8);
}

export function Spacecraft({ v, powered = true }: { v: SpacecraftVisual; powered?: boolean }) {
  const panelW = v.bodyH * 0.72;
  const panelH = v.bodyH * 0.85;
  const panelColor = powered ? '#2547b8' : '#1a1d29';
  const panelEmissive = powered ? '#1b3a9e' : '#000000';
  const half = v.bodyW / 2;

  return (
    <group>
      {/* Body wrapped in gold insulation foil */}
      <mesh castShadow>
        <boxGeometry args={[v.bodyW, v.bodyH, v.bodyW]} />
        <meshStandardMaterial color="#e2b443" metalness={0.35} roughness={0.42} emissive="#3a2a08" emissiveIntensity={0.4} />
      </mesh>
      {/* top and bottom plates */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, (s * v.bodyH) / 2, 0]}>
          <boxGeometry args={[v.bodyW * 1.04, 0.03, v.bodyW * 1.04]} />
          <meshStandardMaterial color="#9aa3b5" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}

      {/* Solar cells glued onto the body */}
      {v.bodyCells &&
        [0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[Math.sin((i * Math.PI) / 2) * (half + 0.006), 0, Math.cos((i * Math.PI) / 2) * (half + 0.006)]}>
            <planeGeometry args={[v.bodyW * 0.86, v.bodyH * 0.8]} />
            <meshStandardMaterial color={panelColor} emissive={panelEmissive} emissiveIntensity={0.45} metalness={0.25} roughness={0.35} side={THREE.DoubleSide} />
          </mesh>
        ))}

      {/* Deployable solar wings: one panel per step, they unfold outwards */}
      {v.panelsPerWing > 0 &&
        [1, -1].map((side) => (
          <group key={`${side}-${v.panelsPerWing}`} position={[side * half, 0, 0]} scale={[side, 1, 1]}>
            <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
              <meshStandardMaterial color="#cfd6e4" metalness={0.8} roughness={0.3} />
            </mesh>
            <Grow axis="x" position={[0.12, 0, 0]}>
              {Array.from({ length: v.panelsPerWing }, (_, i) => (
                <group key={i} position={[i * (panelW + 0.03) + panelW / 2, 0, 0]}>
                  <mesh>
                    <boxGeometry args={[panelW, panelH, 0.02]} />
                    <meshStandardMaterial color={panelColor} emissive={panelEmissive} emissiveIntensity={0.45} metalness={0.25} roughness={0.35} />
                  </mesh>
                  {/* cell grid lines */}
                  <mesh position={[0, 0, 0.012]}>
                    <planeGeometry args={[panelW * 0.96, 0.008]} />
                    <meshBasicMaterial color="#8fa6e8" transparent opacity={0.5} />
                  </mesh>
                  <mesh position={[0, 0, 0.012]}>
                    <planeGeometry args={[0.008, panelH * 0.96]} />
                    <meshBasicMaterial color="#8fa6e8" transparent opacity={0.5} />
                  </mesh>
                </group>
              ))}
            </Grow>
          </group>
        ))}

      {/* Antenna: whip (slow radio), patch (medium), dish (fast / deep space) */}
      <Grow key={`${v.antenna}-${v.dishRadius.toFixed(2)}`} position={[0, v.bodyH / 2, 0]}>
        {v.antenna === 'whip' && (
          <mesh position={[half * 0.6, 0.3, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.6, 6]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.2} />
          </mesh>
        )}
        {v.antenna === 'patch' && (
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[v.bodyW * 0.45, 0.04, v.bodyW * 0.45]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.3} roughness={0.5} />
          </mesh>
        )}
        {v.antenna === 'dish' && (
          <group position={[0, 0.12, 0]} rotation={[-0.5, 0, 0]}>
            <mesh rotation={[Math.PI, 0, 0]}>
              <sphereGeometry args={[v.dishRadius * 1.4, 32, 12, 0, Math.PI * 2, 0, 0.75]} />
              <meshStandardMaterial color="#f1f5f9" metalness={0.4} roughness={0.35} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, -v.dishRadius * 0.35, 0]}>
              <cylinderGeometry args={[0.012, 0.012, v.dishRadius * 0.9, 6]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            <mesh position={[0, -0.12, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.12, 6]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
          </group>
        )}
      </Grow>

      {/* Star tracker (precise pointing) */}
      {v.starTracker && (
        <Grow position={[-half * 0.6, v.bodyH / 2 + 0.05, -half * 0.6]}>
          <mesh rotation={[0.6, 0, 0.6]}>
            <cylinderGeometry args={[0.045, 0.06, 0.12, 12]} />
            <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.4} />
          </mesh>
        </Grow>
      )}

      {/* Instruments: pods on the front face, colored by instrument type */}
      {v.instruments.map((ins, i) => {
        const n = v.instruments.length;
        const x = n === 1 ? 0 : -half * 0.55 + (i * (half * 1.1)) / (n - 1);
        const y = -v.bodyH * 0.15 + (i % 2) * v.bodyH * 0.25;
        return (
          <Grow key={ins.id} position={[x, y, half]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, ins.size / 2]}>
              <cylinderGeometry args={[ins.size * 0.5, ins.size * 0.6, ins.size, 20]} />
              <meshStandardMaterial color="#d1d5db" metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0, ins.size + 0.004]}>
              <circleGeometry args={[ins.size * 0.38, 24]} />
              <meshStandardMaterial color={ins.color} emissive={ins.color} emissiveIntensity={0.9} />
            </mesh>
          </Grow>
        );
      })}
    </group>
  );
}
