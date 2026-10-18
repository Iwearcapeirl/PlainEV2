import data from "@/data/warranty.json";
import type { Car } from "./cars";
import { VALUATION_YEAR } from "./market";

/**
 * UK maker warranties (data/warranty.json): the car warranty, the battery warranty and whether they pass to the
 * next owner, checked on each maker's official UK website. Terms are today's: older cars may have had different
 * ones, so used-car estimates say "likely".
 */

/** Years and miles; miles "unlimited" means no mileage limit, null means it wasn't stated. */
export interface Term {
  years: number | null;
  miles: number | "unlimited" | null;
}
export interface BatteryTerm extends Term {
  /** Share of the original capacity guaranteed, e.g. 70; null when not stated. */
  capacity: number | null;
}
export interface Warranty {
  car?: Term;
  carNote?: string;
  battery?: BatteryTerm;
  batteryNote?: string;
  transfer: "yes" | "conditions" | "unknown";
  transferNote?: string;
  source?: string;
  sourceLabel?: string;
  /** Set when the maker has closed down. */
  closed?: string;
}
interface Entry extends Warranty {
  models?: { match: string[]; car?: Term; battery?: BatteryTerm }[];
}

const MAKES = (data as unknown as { makes: Record<string, Entry> }).makes;
export const WARRANTY_CHECKED = (data as { checked: string }).checked;

/** The warranty for this car, with any per-model terms applied (e.g. Tesla's longer battery cover on Long Range). */
export function warrantyOf(car: Pick<Car, "make" | "model">): Warranty | null {
  const e = MAKES[car.make];
  if (!e) return null;
  const { models, ...w } = e;
  const m = models?.find((o) => o.match.some((word) => car.model.includes(word)));
  return m ? { ...w, ...(m.car ? { car: m.car, carNote: undefined } : {}), ...(m.battery ? { battery: m.battery } : {}) } : w;
}

const int = (n: number) => n.toLocaleString("en-GB");

/** "7 years / 100,000 miles", "3 years / unlimited miles", "3 years" */
export function formatTerm(t: Term): string {
  if (t.years === null) return "Not confirmed";
  const years = `${t.years} years`;
  if (t.miles === "unlimited") return `${years} / unlimited miles`;
  return t.miles === null ? years : `${years} / ${int(t.miles)} miles`;
}

/** "8 years / 100,000 miles, at least 70% capacity" */
export function formatBattery(t: BatteryTerm): string {
  return t.capacity !== null ? `${formatTerm(t)}, at least ${t.capacity}% capacity` : formatTerm(t);
}

export const TRANSFER_LABEL: Record<Warranty["transfer"], string> = {
  yes: "Yes",
  conditions: "Yes, with conditions",
  unknown: "Not confirmed",
};

/** A single number for comparing terms: years first, then miles (unlimited beats any limit; not stated counts as 0). */
export const termScore = (t: Term | undefined): number | null =>
  !t || t.years === null ? null : t.years * 10_000_000 + (t.miles === "unlimited" ? 9_999_999 : (t.miles ?? 0));

/**
 * For a used car of a given model year: the year each warranty likely runs to (counted from the model year, as the
 * first registration date isn't known), or null when it has likely ended.
 */
export function usedWarrantyLeft(w: Warranty, modelYear: number): { car: number | null; battery: number | null } {
  const until = (t?: Term) => (t && t.years !== null && modelYear + t.years >= VALUATION_YEAR ? modelYear + t.years : null);
  return { car: until(w.car), battery: until(w.battery) };
}

/** Years of cover for filters and sorting. */
export const carWarrantyYears = (c: Pick<Car, "make" | "model">) => warrantyOf(c)?.car?.years ?? null;
export const batteryWarrantyYears = (c: Pick<Car, "make" | "model">) => warrantyOf(c)?.battery?.years ?? null;
