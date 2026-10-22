import { u } from "@/components/UnitText";
import { formatKm, kmToMiles, milesToKm } from "@/lib/format";
import { both } from "@/lib/units";

const km10 = (miles: number) => Math.round(milesToKm(miles) / 10) * 10;

/** Every bar uses the same scale, so cars can be compared at a glance down a list. */
export const RANGE_SCALE_MILES = 600;
const SCALE_KM = milesToKm(RANGE_SCALE_MILES);
const TICKS = [100, 200, 300, 400, 500];

const pct = (km: number) => `${Math.min(100, (km / SCALE_KM) * 100).toFixed(2)}%`;

/**
 * Real-world range as a strip of road on a 0–600 mile scale.
 * Solid yellow: real-world range. Hatched: the extra distance with one 15-minute charging stop
 * (EV Database's motorway "1-stop range"), drawn only when it is longer than the real range.
 */
export default function RangeBar({
  rangeKm,
  oneStopKm,
  size = "md",
}: {
  rangeKm: number;
  oneStopKm: number;
  size?: "md" | "lg";
}) {
  const miles = kmToMiles(rangeKm);
  const extends_ = oneStopKm > rangeKm;
  const lg = size === "lg";

  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className={`font-wide font-semibold tabular-nums leading-none ${lg ? "text-5xl sm:text-6xl" : "text-3xl"}`}>
          {u(both(String(miles), String(rangeKm)))}
        </span>
        <span className={`font-semibold ${lg ? "text-lg" : "text-base"}`}>{u(both("miles", "km"))}</span>
        <span className="text-sm text-muted">({u(formatKm(rangeKm))}) real-world range</span>
      </p>

      <div
        className={`relative mt-3 w-full overflow-hidden rounded-full bg-line ${lg ? "h-3.5" : "h-2.5"}`}
        role="img"
        aria-label={`${miles} miles real-world range${extends_ ? `, ${kmToMiles(oneStopKm)} miles with one 15-minute charging stop` : ""}, on a scale of 0 to ${RANGE_SCALE_MILES} miles`}
      >
        {extends_ && (
          <div data-fill className="hatch-signal absolute inset-y-0 left-0" style={{ width: pct(oneStopKm) }} />
        )}
        <div data-fill className="absolute inset-y-0 left-0 rounded-full bg-signal" style={{ width: pct(rangeKm) }} />
        {TICKS.map((t) => (
          <span
            key={t}
            aria-hidden
            className="absolute inset-y-0 w-px bg-card/70"
            style={{ left: pct(milesToKm(t)) }}
          />
        ))}
      </div>

      <div aria-hidden className="mt-1 flex justify-between text-[10px] tabular-nums text-muted">
        <span>0</span>
        {lg && TICKS.map((t) => <span key={t}>{u(both(String(t), String(km10(t))))}</span>)}
        <span>{u(both(`${RANGE_SCALE_MILES} mi`, `${km10(RANGE_SCALE_MILES)} km`))}</span>
      </div>
    </div>
  );
}
