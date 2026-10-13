import { bodyLabel, driveLabel } from "./carProfile";
import { cars, type Car } from "./cars";
import { KM_PER_MILE, kmToMiles, miPerKwh } from "./format";

/**
 * Every field in the car data that a reader can filter or sort the results by, in the units the site shows
 * (miles, mi/kWh, £). Values are computed from the stored metric data, so filtering and sorting match
 * what each card displays.
 */

interface Base {
  key: string;
  label: string;
}
export interface NumberField extends Base {
  kind: "number";
  /** Shown beside the inputs, e.g. "mi" or "£". `prefix` puts it before the number. */
  unit: string;
  prefix?: boolean;
  step: number;
  get: (c: Car) => number;
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

const choice = (key: string, label: string, get: (c: Car) => string, display: (v: string) => string = (v) => v): ChoiceField => ({
  key,
  label,
  kind: "choice",
  get,
  options: [...new Set(cars.map(get))].map((value) => ({ value, label: display(value) })).sort((a, b) => a.label.localeCompare(b.label)),
});

export const FIELDS: Field[] = [
  { key: "price", label: "Price (UK)", kind: "number", unit: "£", prefix: true, step: 1000, get: (c) => c.priceGbp },
  { key: "range", label: "Real-world range", kind: "number", unit: "mi", step: 10, get: (c) => kmToMiles(c.rangeKm) },
  { key: "onestop", label: "Range with one 15-min charge", kind: "number", unit: "mi", step: 10, get: (c) => kmToMiles(c.oneStopKm) },
  { key: "efficiency", label: "Efficiency", kind: "number", unit: "mi/kWh", step: 0.1, get: (c) => Math.round(miPerKwh(c.whPerKm) * 10) / 10 },
  { key: "permile", label: "Price per mile of range", kind: "number", unit: "£", prefix: true, step: 10, get: (c) => Math.round(c.priceGbp / (c.rangeKm / KM_PER_MILE)) },
  { key: "battery", label: "Usable battery", kind: "number", unit: "kWh", step: 5, get: (c) => c.batteryKwh },
  { key: "charging", label: "Rapid charging speed", kind: "number", unit: "kW", step: 10, get: (c) => c.fastchargeKw },
  { key: "accel", label: "0–62 mph time", kind: "number", unit: "s", step: 0.1, get: (c) => c.accelS },
  { key: "seats", label: "Seats", kind: "number", unit: "seats", step: 1, get: (c) => c.seats },
  choice("make", "Make", (c) => c.make),
  choice("body", "Body style", (c) => c.body, bodyLabel),
  choice("drive", "Drive", (c) => c.drive, driveLabel),
  choice("chemistry", "Battery chemistry", (c) => c.chemistry ?? "Unknown"),
  { key: "heatpump", label: "Heat pump", kind: "bool", get: (c) => c.heatPump },
  { key: "v2l", label: "Vehicle-to-load (V2L)", kind: "bool", get: (c) => c.v2l },
  { key: "name", label: "Model name", kind: "text", get: (c) => c.fullName },
];

export const fieldByKey = (key: string) => FIELDS.find((f) => f.key === key);

/** Fields that can be sorted: everything except yes/no. */
export const SORT_FIELDS = FIELDS.filter((f) => f.kind !== "bool");

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

export function passes(car: Car, f: CustomFilter): boolean {
  const field = fieldByKey(f.key);
  if (!field || !isSet(f)) return true;
  switch (field.kind) {
    case "number": {
      const [lo, hi] = parseRange(f.value);
      const v = field.get(car);
      return (lo === null || v >= lo) && (hi === null || v <= hi);
    }
    case "choice":
      return field.get(car) === f.value;
    case "bool":
      return field.get(car) === (f.value === "yes");
    case "text":
      return field.get(car).toLowerCase().includes(f.value.trim().toLowerCase());
  }
}

/** Applies the custom filters, then the custom sort (ties keep the incoming "best match" order). */
export function refine(ranked: Car[], r: Refinement): Car[] {
  const out = ranked.filter((c) => r.filters.every((f) => passes(c, f)));
  const field = r.sort ? fieldByKey(r.sort) : undefined;
  if (!field || field.kind === "bool") return out;
  const sign = r.dir === "asc" ? 1 : -1;
  const value = field.get as (c: Car) => number | string;
  return out
    .map((car, i) => ({ car, i }))
    .sort((x, y) => {
      const a = value(x.car);
      const b = value(y.car);
      const d = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
      return d * sign || x.i - y.i;
    })
    .map((x) => x.car);
}

/** Short description of a filter for the summary line, e.g. "Price (UK) £20,000–£40,000". */
export function describe(f: CustomFilter): string {
  const field = fieldByKey(f.key);
  if (!field) return "";
  switch (field.kind) {
    case "number": {
      const [lo, hi] = parseRange(f.value);
      const fmt = (n: number) => (field.prefix ? `${field.unit}${n.toLocaleString("en-GB")}` : `${n.toLocaleString("en-GB")} ${field.unit}`);
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
