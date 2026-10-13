/**
 * Decorative "range map": rings at 100–500 miles around a charging point, with faint dashed
 * spokes like roads leaving a town. Optional highlighted rings mark real figures from the data.
 * Purely decorative (aria-hidden); colour comes from `currentColor`, highlights use the signal yellow.
 */

const MAX_MILES = 500;
const RINGS = [100, 200, 300, 400, 500];
// Spokes: [angle in degrees, length as a share of the 500-mile radius]. Hand-placed so they read as roads, not a grid.
const SPOKES: [number, number][] = [
  [-152, 1.08], [-118, 0.86], [-74, 1.12], [-31, 0.94], [8, 1.1], [47, 0.8], [96, 1.05], [141, 0.9], [188, 1.0],
];

const C = 500; // centre of the 1000×1000 viewBox
const R = 450; // radius of the 500-mile ring
const r = (miles: number) => (miles / MAX_MILES) * R;

export interface RingHighlight {
  miles: number;
  /** Optional label drawn on the ring; omit it when the page explains the ring in its own text. */
  label?: string;
  /** Where on the ring the label sits, in degrees (0 = right, -90 = top). */
  angle?: number;
  /** Ring colour (defaults to the signal yellow). */
  color?: string;
}

export default function RangeRings({
  className = "",
  highlights = [],
  labels = true,
  animate = false,
}: {
  className?: string;
  highlights?: RingHighlight[];
  labels?: boolean;
  /** Draw the rings outwards once on page load (skipped with prefers-reduced-motion). */
  animate?: boolean;
}) {
  const labelAngle = (-58 * Math.PI) / 180;
  return (
    <svg viewBox="0 0 1000 1000" aria-hidden focusable="false" className={className} fill="none">
      {/* roads */}
      <g stroke="currentColor" strokeOpacity="0.55" strokeDasharray="10 12" strokeWidth="1.2">
        {SPOKES.map(([deg, len]) => {
          const a = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={C + Math.cos(a) * 18}
              y1={C + Math.sin(a) * 18}
              x2={C + Math.cos(a) * R * len}
              y2={C + Math.sin(a) * R * len}
            />
          );
        })}
      </g>

      {/* distance rings */}
      <g stroke="currentColor" strokeWidth="1.2">
        {RINGS.map((m, i) => (
          <circle
            key={m}
            cx={C}
            cy={C}
            r={r(m)}
            pathLength={1}
            className={animate ? "ring-draw" : undefined}
            style={animate ? { animationDelay: `${i * 90}ms` } : undefined}
          />
        ))}
      </g>

      {labels && (
        <g fill="currentColor" fontSize="15" fontFamily="inherit" letterSpacing="0.02em">
          {RINGS.map((m) => (
            <text key={m} x={C + Math.cos(labelAngle) * r(m) + 8} y={C + Math.sin(labelAngle) * r(m) - 6}>
              {m} mi
            </text>
          ))}
        </g>
      )}

      {/* highlighted real figures */}
      {highlights.map((h, i) => {
        const a = ((h.angle ?? -112) * Math.PI) / 180;
        return (
        <g key={h.miles}>
          <circle
            cx={C}
            cy={C}
            r={r(h.miles)}
            stroke={h.color ?? "var(--signal)"}
            strokeWidth="2.4"
            pathLength={1}
            className={animate ? "ring-draw" : undefined}
            style={animate ? { animationDelay: `${500 + i * 160}ms` } : undefined}
          />
          {h.label && <text
            x={C + Math.cos(a) * r(h.miles)}
            y={C + Math.sin(a) * r(h.miles) + (Math.sin(a) < 0 ? -12 : 26)}
            fill={h.color ?? "var(--signal)"}
            fontSize="17"
            fontWeight="600"
            textAnchor="middle"
          >
            {h.label}
          </text>}
        </g>
        );
      })}

      {/* the charging point */}
      <circle cx={C} cy={C} r="16" stroke="var(--signal)" strokeWidth="2" />
      <circle cx={C} cy={C} r="6" fill="var(--signal)" />
    </svg>
  );
}
