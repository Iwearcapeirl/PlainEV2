import { bodyLabel, driveLabel, segmentLabel } from "./carProfile";
import { allCars, type Car } from "./cars";
import { COUNTRIES, usedFrom, type Country } from "./market";
import { KM_PER_MILE, kmToMiles, miPerKwh } from "./format";
import { looseIncludes } from "./text";
import { batteryWarrantyYears, carWarrantyYears } from "./warranty";

/**
 * Every field in the car data that a reader can filter or sort the results by, in the units the site shows
 * (miles, mi/kWh, £). Values are computed from the stored metric data, so filtering and sorting match
 * what each card displays.
 */

interface Base {
  key: string;
  label: string;
  /** Extra meaning for the search assistant (not shown on the page). */
  about?: string;
}
export interface NumberField extends Base {
  kind: "number";
  /** Shown beside the inputs, e.g. "mi" or "£". `prefix` puts it before the number. */
  unit: string;
  prefix?: boolean;
  step: number;
  /**
   * null when the data has no value for this car (it then fails any min/max filter and sorts last). `country` is
   * the buyer's, for figures that depend on it (used prices).
   */
  get: (c: Car, country: Country) => number | null;
  /** The unit is the buyer's currency (£ or €) rather than a fixed one. */
  currency?: boolean;
  /** false for years, which shouldn't be written "2,026". */
  grouping?: boolean;
}
export interface ChoiceField extends Base {
  kind: "choice";
  get: (c: Car) => string;
  /** Every value in the data, with its display label, sorted by label. */
  options: { value: string; label: string }[];
}
export interface BoolField extends Base {
  kind: "bool";
  get: (c: Car) => boolean;
}
export interface TextField extends Base {
  kind: "text";
  get: (c: Car) => string;
}
export type Field = NumberField | ChoiceField | BoolField | TextField;

/** mm → metres to 2 decimals, matching what the car page shows ("4.64 m"). */
const toMetres = (mm: number | null) => (mm === null ? null : Math.round(mm / 10) / 100);

const choice = (key: string, label: string, get: (c: Car) => string, display: (v: string) => string = (v) => v): ChoiceField => ({
  key,
  label,
  kind: "choice",
  get,
  options: [...new Set(allCars.map(get))].map((value) => ({ value, label: display(value) })).sort((a, b) => a.label.localeCompare(b.label)),
});

export const FIELDS: Field[] = [
  { key: "price", label: "UK price when new", kind: "number", unit: "£", prefix: true, step: 1000, get: (c) => c.priceGbp },
  { key: "usedprice", label: "Used price from (estimated)", kind: "number", unit: "£", prefix: true, currency: true, step: 1000, get: (c, country) => usedFrom(c, country)?.low ?? null, about: "cheapest estimated second-hand price (oldest model year) in the buyer's country and currency; blank for cars not yet sold" },
  { key: "range", label: "Real-world range", kind: "number", unit: "mi", step: 10, get: (c) => kmToMiles(c.rangeKm) },
  { key: "onestop", label: "Range with one 15-min charge", kind: "number", unit: "mi", step: 10, get: (c) => kmToMiles(c.oneStopKm) },
  { key: "efficiency", label: "Efficiency", kind: "number", unit: "mi/kWh", step: 0.1, get: (c) => Math.round(miPerKwh(c.whPerKm) * 10) / 10 },
  { key: "permile", label: "Price per mile of range", kind: "number", unit: "£", prefix: true, step: 10, get: (c) => (c.priceGbp === null ? null : Math.round(c.priceGbp / (c.rangeKm / KM_PER_MILE))) },
  { key: "battery", label: "Usable battery", kind: "number", unit: "kWh", step: 5, get: (c) => c.batteryKwh },
  { key: "charging", label: "Rapid charging speed", kind: "number", unit: "kW", step: 10, get: (c) => c.fastchargeKw },
  { key: "accel", label: "0–62 mph time", kind: "number", unit: "s", step: 0.1, get: (c) => c.accelS, about: "same as 0–100 km/h" },
  { key: "ac", label: "AC charging speed", kind: "number", unit: "kW", step: 1, get: (c) => c.acChargeKw, about: "home wallbox or destination charging" },
  { key: "boot", label: "Boot space", kind: "number", unit: "L", step: 10, get: (c) => c.cargoL, about: "litres" },
  { key: "towing", label: "Towing capacity", kind: "number", unit: "kg", step: 100, get: (c) => c.towingKg, about: "braked; 0 means not approved for towing" },
  { key: "length", label: "Length", kind: "number", unit: "m", step: 0.05, get: (c) => toMetres(c.lengthMm), about: "metres, e.g. 4.5" },
  { key: "width", label: "Width (without mirrors)", kind: "number", unit: "m", step: 0.05, get: (c) => toMetres(c.widthMm), about: "metres, body only" },
  { key: "widthmirrors", label: "Width with mirrors", kind: "number", unit: "m", step: 0.05, get: (c) => toMetres(c.widthMirrorsMm), about: "metres, mirrors unfolded; listed for fewer cars" },
  { key: "height", label: "Height", kind: "number", unit: "m", step: 0.05, get: (c) => toMetres(c.heightMm), about: "metres, e.g. under 1.6 for a low garage door" },
  { key: "payload", label: "Max payload", kind: "number", unit: "kg", step: 50, get: (c) => c.payloadKg, about: "most weight of people and luggage it can carry" },
  { key: "carwarranty", label: "Car warranty (UK)", kind: "number", unit: "years", step: 1, grouping: false, get: (c) => carWarrantyYears(c), about: "maker's warranty length in years; blank when not confirmed" },
  { key: "batterywarranty", label: "Battery warranty (UK)", kind: "number", unit: "years", step: 1, grouping: false, get: (c) => batteryWarrantyYears(c), about: "battery warranty length in years; blank when not confirmed" },
  { key: "weight", label: "Weight", kind: "number", unit: "kg", step: 50, get: (c) => c.weightKg },
  { key: "ncap", label: "Euro NCAP safety rating", kind: "number", unit: "stars", step: 1, get: (c) => c.ncapStars, about: "blank when not yet tested" },
  { key: "year", label: "Model year", kind: "number", unit: "", step: 1, grouping: false, get: (c) => c.yearFrom, about: "year the current version went on sale" },
  { key: "lastyear", label: "Last model year", kind: "number", unit: "", step: 1, grouping: false, get: (c) => c.yearTo, about: "only set when the end of sales has been announced" },
  { key: "ppkeur", label: "Price per km of range (EUR)", kind: "number", unit: "€", prefix: true, step: 5, get: (c) => c.pricePerKmEur, about: "European value-for-money measure" },
  { key: "pricede", label: "Price in Germany", kind: "number", unit: "€", prefix: true, step: 1000, get: (c) => c.priceDeEur },
  { key: "pricenl", label: "Price in the Netherlands", kind: "number", unit: "€", prefix: true, step: 1000, get: (c) => c.priceNlEur },
  { key: "seats", label: "Seats", kind: "number", unit: "seats", step: 1, get: (c) => c.seats },
  choice("make", "Make", (c) => c.make),
  choice("body", "Body style", (c) => c.body, bodyLabel),
  choice("drive", "Drive", (c) => c.drive, driveLabel),
  choice("chemistry", "Battery chemistry", (c) => c.chemistry ?? "Unknown"),
  choice("segment", "Size class", (c) => c.segment, segmentLabel),
  choice("plug", "Charging plug", (c) => c.chargePlug),
  choice("status", "Sales status", (c) => c.status),
  { key: "heatpump", label: "Heat pump", kind: "bool", get: (c) => c.heatPump },
  { key: "v2l", label: "Vehicle-to-load (V2L)", kind: "bool", get: (c) => c.v2l },
  { key: "v2h", label: "Vehicle-to-home (V2H)", kind: "bool", get: (c) => c.v2h, about: "can power a house" },
  { key: "v2g", label: "Vehicle-to-grid (V2G)", kind: "bool", get: (c) => c.v2g, about: "can sell power back to the grid" },
  { key: "towbar", label: "Towbar available", kind: "bool", get: (c) => c.towbar },
  { key: "ending", label: "End of sales announced", kind: "bool", get: (c) => c.availableTo !== null, about: "being discontinued" },
  { key: "rangeest", label: "Range is an estimate", kind: "bool", get: (c) => c.rangeEstimated, about: "no = confirmed figure" },
  { key: "effest", label: "Efficiency is an estimate", kind: "bool", get: (c) => c.efficiencyEstimated },
  { key: "battest", label: "Battery size is an estimate", kind: "bool", get: (c) => c.batteryEstimated },
  { key: "ppkest", label: "Price per km is an estimate", kind: "bool", get: (c) => c.pricePerKmEstimated },
  { key: "name", label: "Model name", kind: "text", get: (c) => c.fullName, about: "make and model, e.g. a brand or trim word" },
  { key: "availability", label: "Availability", kind: "text", get: (c) => `${c.availability} (${c.availableFrom}${c.availableTo ? ` to ${c.availableTo}` : ""})`, about: 'e.g. "Available to order since April 2026 (2026-04-01)"' },
];

export const fieldByKey = (key: string) => FIELDS.find((f) => f.key === key);

/** Fields that can be sorted: everything except yes/no. */
export const SORT_FIELDS = FIELDS.filter((f) => f.kind !== "bool");

/** A number field's unit for this buyer: their currency symbol for prices that follow the country. */
export const unitOf = (field: NumberField, country: Country = "uk") => (field.currency ? COUNTRIES[country].symbol : field.unit);

// ---------- Filters ----------

/**
 * One custom filter. `value` depends on the field: "min~max" for numbers (either side may be empty),
 * the raw data value for a choice, "yes"/"no" for yes/no fields, and the search text for text.
 */
export interface CustomFilter {
  key: string;
  value: string;
}

export interface Refinement {
  filters: CustomFilter[];
  /** Field key, or null for the default "best match" ranking. */
  sort: string | null;
  dir: "asc" | "desc";
}

export const EMPTY_REFINEMENT: Refinement = { filters: [], sort: null, dir: "asc" };

/** Default value for a newly added filter (an open range, the first option, "yes", or empty text). */
export function defaultValue(f: Field): string {
  if (f.kind === "number") return "~";
  if (f.kind === "choice") return f.options[0]?.value ?? "";
  if (f.kind === "bool") return "yes";
  return "";
}

const parseRange = (v: string): [number | null, number | null] => {
  const [lo = "", hi = ""] = v.split("~");
  const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? null : Number(s));
  return [num(lo), num(hi)];
};

/** Whether the filter actually narrows anything (an empty range or empty text doesn't). */
export function isSet(f: CustomFilter): boolean {
  const field = fieldByKey(f.key);
  if (!field) return false;
  if (field.kind === "number") return parseRange(f.value).some((n) => n !== null);
  if (field.kind === "text") return f.value.trim() !== "";
  return true;
}

export function passes(car: Car, f: CustomFilter, country: Country = "uk"): boolean {
  const field = fieldByKey(f.key);
  if (!field || !isSet(f)) return true;
  switch (field.kind) {
    case "number": {
      const [lo, hi] = parseRange(f.value);
      const v = field.get(car, country);
      if (v === null) return false;
      return (lo === null || v >= lo) && (hi === null || v <= hi);
    }
    case "choice":
      return field.get(car) === f.value;
    case "bool":
      return field.get(car) === (f.value === "yes");
    case "text":
      return looseIncludes(field.get(car), f.value);
  }
}

/** Applies the custom filters, then the custom sort (ties keep the incoming "best match" order). */
export function refine(ranked: Car[], r: Refinement, country: Country = "uk"): Car[] {
  const out = ranked.filter((c) => r.filters.every((f) => passes(c, f, country)));
  const field = r.sort ? fieldByKey(r.sort) : undefined;
  if (!field || field.kind === "bool") return out;
  const sign = r.dir === "asc" ? 1 : -1;
  const value = (c: Car): number | string | null => (field.kind === "number" ? field.get(c, country) : field.get(c));
  return out
    .map((car, i) => ({ car, i }))
    .sort((x, y) => {
      const a = value(x.car);
      const b = value(y.car);
      // Cars with no value for this field go last, whichever direction.
      if (a === null || b === null) return a === b ? x.i - y.i : a === null ? 1 : -1;
      const d = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
      return d * sign || x.i - y.i;
    })
    .map((x) => x.car);
}

/** Short description of a filter for the summary line, e.g. "Price (UK) £20,000–£40,000". */
export function describe(f: CustomFilter, country: Country = "uk"): string {
  const field = fieldByKey(f.key);
  if (!field) return "";
  switch (field.kind) {
    case "number": {
      const [lo, hi] = parseRange(f.value);
      const show = (n: number) => n.toLocaleString("en-GB", { useGrouping: field.grouping ?? true });
      const unit = unitOf(field, country);
      const fmt = (n: number) => (field.prefix ? `${unit}${show(n)}` : `${show(n)} ${unit}`.trim());
      if (lo !== null && hi !== null) return `${field.label}: ${fmt(lo)} to ${fmt(hi)}`;
      return `${field.label}: ${lo !== null ? `at least ${fmt(lo)}` : `up to ${fmt(hi!)}`}`;
    }
    case "choice":
      return `${field.label}: ${field.options.find((o) => o.value === f.value)?.label ?? f.value}`;
    case "bool":
      return `${field.label}: ${f.value === "yes" ? "yes" : "no"}`;
    case "text":
      return `${field.label} contains “${f.value.trim()}”`;
  }
}

// ---------- URL ----------

type Reader = { get(name: string): string | null; getAll(name: string): string[] };

/** Reads `f=key:value` (repeatable), `sort=key` and `dir=asc|desc`. Unknown fields are dropped. */
export function refinementFromParams(params: Reader): Refinement {
  const filters = params
    .getAll("f")
    .map((s) => {
      const i = s.indexOf(":");
      return i > 0 ? { key: s.slice(0, i), value: s.slice(i + 1) } : null;
    })
    .filter((f): f is CustomFilter => f !== null && fieldByKey(f.key) !== undefined);
  const sort = params.get("sort");
  return {
    filters,
    sort: sort && SORT_FIELDS.some((f) => f.key === sort) ? sort : null,
    dir: params.get("dir") === "desc" ? "desc" : "asc",
  };
}

/** Writes the refinement onto existing params (replacing any previous one). Unset filters are left out. */
export function writeRefinement(params: URLSearchParams, r: Refinement): URLSearchParams {
  const p = new URLSearchParams(params);
  p.delete("f");
  p.delete("sort");
  p.delete("dir");
  for (const f of r.filters) if (isSet(f)) p.append("f", `${f.key}:${f.value}`);
  if (r.sort) {
    p.set("sort", r.sort);
    p.set("dir", r.dir);
  }
  return p;
}

export const isRefined = (r: Refinement) => r.sort !== null || r.filters.some(isSet);
