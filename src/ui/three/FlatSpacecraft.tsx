/** Flat (SVG) drawing of the same spacecraft: used when 3D is off or not supported. */
import type { SceneMode } from './MissionScene';
import type { SpacecraftVisual } from './visuals';

const MODE_LABEL: Partial<Record<SceneMode, string>> = {
  launch: '🚀 Launching…',
  cruise: '➡️ Cruising to destination…',
  orbit: '🛰️ In orbit',
  success: '✓ Mission accomplished',
  cancelled: '✕ Mission cancelled',
  explode: '💥 Lost at launch',
  tumble: '✕ Spacecraft lost',
};

export function FlatSpacecraft({ v, powered, mode }: { v: SpacecraftVisual; powered: boolean; mode?: SceneMode }) {
  const S = 60; // px per 3D unit
  const bw = v.bodyW * S;
  const bh = v.bodyH * S;
  const pw = v.bodyH * 0.72 * S;
  const ph = v.bodyH * 0.85 * S;
  const panel = powered ? '#2547b8' : '#1a1d29';
  const wing = v.panelsPerWing * (pw + 2);
  const width = bw + 2 * (wing + 8) + 20;
  const height = bh + 90;
  const cx = width / 2;
  const top = 50;
  const failed = mode === 'tumble' || mode === 'explode' || mode === 'cancelled';
  return (
    <div className="flat-view">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Drawing of your spacecraft" className={failed ? 'flat-failed' : ''}>
        {[1, -1].map((s) =>
          Array.from({ length: v.panelsPerWing }, (_, i) => (
            <rect
              key={`${s}${i}`}
              x={s > 0 ? cx + bw / 2 + 8 + i * (pw + 2) : cx - bw / 2 - 8 - (i + 1) * (pw + 2)}
              y={top + (bh - ph) / 2}
              width={pw}
              height={ph}
              fill={panel}
              stroke="#8fa6e8"
              strokeOpacity={0.4}
            />
          )),
        )}
        {v.panelsPerWing > 0 && <line x1={cx - bw / 2 - 8} x2={cx + bw / 2 + 8} y1={top + bh / 2} y2={top + bh / 2} stroke="#cfd6e4" strokeWidth={2} />}
        <rect x={cx - bw / 2} y={top} width={bw} height={bh} fill="#c99a2e" stroke="#9aa3b5" strokeWidth={2} rx={2} />
        {v.bodyCells && <rect x={cx - bw * 0.43} y={top + bh * 0.1} width={bw * 0.86} height={bh * 0.8} fill={panel} />}
        {v.antenna === 'dish' && <path d={`M ${cx - v.dishRadius * 70} ${top - 26} Q ${cx} ${top + 4} ${cx + v.dishRadius * 70} ${top - 26}`} fill="#f1f5f9" />}
        {v.antenna === 'dish' && <line x1={cx} x2={cx} y1={top} y2={top - 14} stroke="#94a3b8" strokeWidth={3} />}
        {v.antenna === 'patch' && <rect x={cx - bw * 0.22} y={top - 5} width={bw * 0.44} height={5} fill="#e5e7eb" />}
        {v.antenna === 'whip' && <line x1={cx + bw * 0.3} x2={cx + bw * 0.3} y1={top} y2={top - 34} stroke="#e5e7eb" strokeWidth={2} />}
        {v.instruments.map((ins, i) => (
          <circle key={ins.id} cx={cx - bw * 0.3 + (v.instruments.length === 1 ? bw * 0.3 : (i * bw * 0.6) / (v.instruments.length - 1))} cy={top + bh * 0.62} r={ins.size * S * 0.45} fill={ins.color} stroke="#d1d5db" strokeWidth={2} />
        ))}
      </svg>
      {mode && MODE_LABEL[mode] && <p className={`flat-mode ${failed ? 'text-fail' : ''}`}>{MODE_LABEL[mode]}</p>}
    </div>
  );
}
