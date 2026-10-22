import { RADAR_PRICE_TICKS, RADAR_RINGS, radarAngle, radarPoints, radarRingRadius } from "@/lib/radar";

/**
 * The range radar: every EV on sale as one point (distance = real-world range, angle = price rank).
 * The same instrument appears on the homepage (every car lit) and in the quiz (cars that no longer match
 * switch off).
 * Purely visual (aria-hidden); every page states the same facts in text. Styles live in globals.css (.rr-*).
 */
export default function RangeRadar({
  lit,
  focusId,
  highlightMiles,
  className = "",
}: {
  /** Cars still in play; any other car is drawn switched off. Omit to light every car. */
  lit?: ReadonlySet<number>;
  /** One car to mark in signal yellow. */
  focusId?: number;
  /** A distance in miles to draw as a yellow ring (e.g. the typical EV). */
  highlightMiles?: number;
  className?: string;
}) {
  const V = 1000;
  const C = V / 2;
  const s = (f: number) => f * V;
  const bezel = 0.485;
  const focus = focusId !== undefined ? radarPoints.find((p) => p.id === focusId) : undefined;

  return (
    <svg viewBox={`0 0 ${V} ${V}`} aria-hidden focusable="false" className={`rr ${className}`} fill="none">
      {/* bezel: fine ticks around the dial, with the price marks longer */}
      <g className="rr-bezel" stroke="currentColor">
        {Array.from({ length: 67 }, (_, i) => {
          const t = (radarAngle(i / 66) * Math.PI) / 180;
          const r1 = s(bezel);
          const r2 = s(bezel) - (i % 6 === 0 ? 14 : 7);
          return (
            <line
              key={i}
              x1={C + Math.cos(t) * r1}
              y1={C + Math.sin(t) * r1}
              x2={C + Math.cos(t) * r2}
              y2={C + Math.sin(t) * r2}
              strokeOpacity={i % 6 === 0 ? 0.5 : 0.25}
              strokeWidth="1.5"
            />
          );
        })}
        {RADAR_PRICE_TICKS.map(({ gbp, a }) => {
          const t = (radarAngle(a) * Math.PI) / 180;
          const r1 = s(bezel) + 4;
          const r2 = s(bezel) - 24;
          const lx = C + Math.cos(t) * (s(bezel) + 6);
          const ly = C + Math.sin(t) * (s(bezel) + 6);
          return (
            <g key={gbp}>
              <line x1={C + Math.cos(t) * r1} y1={C + Math.sin(t) * r1} x2={C + Math.cos(t) * r2} y2={C + Math.sin(t) * r2} stroke="var(--signal)" strokeWidth="2.5" />
              <text
                x={lx + Math.cos(t) * 10}
                y={ly + Math.sin(t) * 10 + 6}
                textAnchor={Math.cos(t) > 0.2 ? "start" : Math.cos(t) < -0.2 ? "end" : "middle"}
                className="rr-label"
                fill="currentColor"
                stroke="none"
              >
                £{gbp / 1000}k
              </text>
            </g>
          );
        })}
      </g>

      {/* distance rings, every 100 miles */}
      <g stroke="currentColor" strokeWidth="1.2">
        {RADAR_RINGS.map((m) => (
          <circle key={m} cx={C} cy={C} r={s(radarRingRadius(m))} strokeOpacity={m === 500 ? 0.35 : 0.18} />
        ))}
      </g>
      <g fill="currentColor" className="rr-label" stroke="none">
        {RADAR_RINGS.slice(0, 4).map((m) => (
          <text key={m} x={C + 8} y={C - s(radarRingRadius(m)) + 20} fillOpacity="0.6">
            <tspan className="u-mi">{m} mi</tspan>
            <tspan className="u-km">{Math.round((m * 1.609344) / 10) * 10} km</tspan>
          </text>
        ))}
      </g>

      {highlightMiles !== undefined && (
        <circle cx={C} cy={C} r={s(radarRingRadius(highlightMiles))} stroke="var(--signal)" strokeWidth="2" strokeOpacity="0.9" strokeDasharray="2 7" strokeLinecap="round" />
      )}

      {/* the cars */}
      <g fill="currentColor" stroke="none">
        {radarPoints.map((p) =>
          p.id === focusId ? null : (
            <circle
              key={p.id}
              cx={s(p.x)}
              cy={s(p.y)}
              r="5"
              className={`rr-dot${lit && !lit.has(p.id) ? " is-off" : ""}`}
              style={{ "--a": p.a.toFixed(4) } as React.CSSProperties}
            />
          ),
        )}
      </g>

      {focus && (
        <g className="rr-focus">
          <circle cx={s(focus.x)} cy={s(focus.y)} r="22" stroke="var(--signal)" strokeWidth="2" className="rr-focus-ring" />
          <circle cx={s(focus.x)} cy={s(focus.y)} r="9" fill="var(--signal)" />
        </g>
      )}

      {/* the charging point at the centre */}
      <circle cx={C} cy={C} r="12" stroke="var(--signal)" strokeWidth="2" />
      <circle cx={C} cy={C} r="4.5" fill="var(--signal)" />
    </svg>
  );
}
