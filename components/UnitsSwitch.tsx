"use client";

import { useSyncExternalStore } from "react";
import { UNITS_KEY, type Units } from "@/lib/units";

/** Fired on window when the units change, so number inputs (filters) can follow. */
const EVENT = "plainev:units";

const read = (): Units => (typeof document !== "undefined" && document.documentElement.dataset.units === "km" ? "km" : "mi");
const subscribe = (fn: () => void) => {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
};

/** The units picked with the switch ("mi" while rendering on the server and before the page has loaded). */
export function useUnits(): Units {
  return useSyncExternalStore(subscribe, read, () => "mi");
}

export function setUnits(units: Units) {
  document.documentElement.dataset.units = units;
  try {
    localStorage.setItem(UNITS_KEY, units);
  } catch {
    // Private browsing or blocked storage: the switch still works for this page.
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Miles/km switch for the top bar. The label is drawn with the same CSS swap as the figures (u-mi / u-km), so it is
 * right from the first paint without waiting for the page's script.
 */
export default function UnitsSwitch() {
  const units = useUnits();
  return (
    <button
      type="button"
      onClick={() => setUnits(read() === "km" ? "mi" : "km")}
      className="flex shrink-0 items-center rounded-lg p-0.5 max-[359px]:p-0 text-xs font-semibold shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--on-ink)_35%,transparent)] hover:shadow-[inset_0_0_0_1px_var(--on-ink)]"
      aria-label={units === "km" ? "Showing kilometres. Switch to miles" : "Showing miles. Switch to kilometres"}
      title="Miles or kilometres"
    >
      {/* Narrow phones: just the current unit (tap to swap). Wider: both, with the current one filled. */}
      <span className="u-mi flex">
        <span className="rounded-md bg-on-ink px-1.5 py-1 text-ink max-[399px]:px-1 max-[359px]:px-1">mi</span>
        <span className="px-1.5 py-1 text-on-ink/70 max-sm:hidden">km</span>
      </span>
      <span className="u-km flex">
        <span className="px-1.5 py-1 text-on-ink/70 max-sm:hidden">mi</span>
        <span className="rounded-md bg-on-ink px-1.5 py-1 text-ink max-[399px]:px-1 max-[359px]:px-1">km</span>
      </span>
    </button>
  );
}
