import { cars, type Car } from "./cars";
import { milesToKm } from "./format";

/**
 * Every filter in the quiz is defined the same way: a list of options, each with
 * - `label`/`hint`: what the quiz shows
 * - `chip`: short text for the results summary and the "matches" chips on each car (null = no filter)
 * - `test`: whether a car passes
 * The first option in each list is the default ("no preference").
 */
export interface FilterOption {
  id: string;
  label: string;
  hint?: string;
  chip: string | null;
  test: (c: Car) => boolean;
}

const any = (label = "No preference", hint?: string): FilterOption => ({ id: "any", label, hint, chip: null, test: () => true });

// ---------- Core questions ----------

const budget = (id: string, label: string, max: number | null): FilterOption => ({
  id,
  label,
  chip: max === null ? null : `Up to £${max / 1000}k`,
  test: (c) => max === null || c.priceGbp <= max,
});

export const BUDGETS: FilterOption[] = [
  budget("no-limit", "No limit", null),
  budget("under-30k", "Under £30k", 30_000),
  budget("30-40k", "£30–40k", 40_000),
  budget("40-50k", "£40–50k", 50_000),
  budget("50-70k", "£50–70k", 70_000),
  budget("over-70k", "Over £70k", null),
];
/** Display order in the quiz (the default sits last here, as "No limit"). */
export const BUDGET_ORDER = ["under-30k", "30-40k", "40-50k", "50-70k", "over-70k", "no-limit"];

const minRange = (miles: number, hint: string): FilterOption => ({
  id: String(miles),
  label: `${miles}+ miles (${Math.round(milesToKm(miles) / 10) * 10}+ km)`,
  hint,
  chip: `${miles}+ mi range`,
  test: (c) => c.rangeKm >= milesToKm(miles),
});

export const RANGES: FilterOption[] = [
  any("Any range", "Includes small city cars with less than 200 miles."),
  minRange(200, "Covers most people’s weekly driving."),
  minRange(250, "Comfortable for regular longer trips."),
  minRange(300, "For lots of motorway driving."),
  minRange(350, "Long-distance specialists. Only a few cars qualify."),
];

const body = (id: string, label: string, match: string[]): FilterOption => ({
  id,
  label,
  chip: label,
  test: (c) => match.includes(c.body),
});

export const BODIES: FilterOption[] = [
  any(),
  body("suv", "SUV", ["SUV"]),
  body("hatchback", "Hatchback", ["Hatchback"]),
  body("saloon", "Sedan / Liftback", ["Sedan", "Liftback"]),
  body("estate", "Estate / Station wagon", ["Station"]),
];
export const BODY_ORDER = ["suv", "hatchback", "saloon", "estate", "any"];

// ---------- Optional "More filters" ----------

const seats = (n: number, label: string): FilterOption => ({
  id: String(n),
  label,
  chip: n === 7 ? "7 seats" : `${n}+ seats`,
  test: (c) => c.seats >= n,
});
export const SEATS: FilterOption[] = [any(), seats(4, "4 or more"), seats(5, "5 or more"), seats(7, "7 seats")];

const drive = (id: string, label: string, value: string): FilterOption => ({ id, label, chip: label, test: (c) => c.drive === value });
export const DRIVES: FilterOption[] = [
  any(),
  drive("fwd", "Front-wheel drive", "Front Wheel Drive"),
  drive("rwd", "Rear-wheel drive", "Rear Wheel Drive"),
  drive("awd", "All-wheel drive", "All Wheel Drive"),
];

const chem = (id: string, label: string, value: string): FilterOption => ({ id, label, chip: `${value} battery`, test: (c) => c.chemistry === value });
export const CHEMISTRIES: FilterOption[] = [any(), chem("lfp", "LFP", "LFP"), chem("ncm", "NCM", "NCM")];

const required = (id: string, chip: string, test: (c: Car) => boolean): FilterOption[] => [
  any(),
  { id, label: "Required", chip, test },
];
export const HEAT_PUMP: FilterOption[] = required("yes", "Heat pump", (c) => c.heatPump);
export const V2L: FilterOption[] = required("yes", "V2L", (c) => c.v2l);

/** Efficiency ceilings in Wh/km (the data's unit), shown miles-first. */
const efficiency = (id: string, maxWh: number, miPerKwh: string, label: string): FilterOption => ({
  id,
  label: `${label}${miPerKwh}+ mi/kWh (≤${maxWh} Wh/km)`,
  chip: `${miPerKwh}+ mi/kWh`,
  test: (c) => c.whPerKm <= maxWh,
});
export const EFFICIENCIES: FilterOption[] = [
  any(),
  efficiency("180", 180, "3.5", ""),
  efficiency("165", 165, "3.8", ""),
  efficiency("best", 155, "4.0", "Best: "),
];

const oneStop = (miles: number): FilterOption => ({
  id: String(miles),
  label: `${miles}+ miles`,
  chip: `${miles}+ mi with one stop`,
  test: (c) => c.oneStopKm >= milesToKm(miles),
});
export const ONE_STOPS: FilterOption[] = [any(), oneStop(300), oneStop(350), oneStop(400)];

/** 0–62 mph ceilings in seconds (0–100 km/h is the same measure). */
const accel = (seconds: number): FilterOption => ({
  id: String(seconds),
  label: `${seconds} s or quicker`,
  chip: `0–62 mph in ${seconds} s or less`,
  test: (c) => c.accelS <= seconds,
});
const accelTimes = cars.map((c) => c.accelS).sort((a, b) => a - b);
const MEDIAN_ACCEL = accelTimes[Math.floor(accelTimes.length / 2)].toFixed(1);
export const ACCELS: FilterOption[] = [any(), accel(8), accel(7), accel(6), accel(5), accel(4)];

// ---------- Registry ----------

export const FILTERS = {
  budget: BUDGETS,
  range: RANGES,
  body: BODIES,
  seats: SEATS,
  drive: DRIVES,
  chemistry: CHEMISTRIES,
  heatPump: HEAT_PUMP,
  v2l: V2L,
  efficiency: EFFICIENCIES,
  oneStop: ONE_STOPS,
  accel: ACCELS,
} satisfies Record<string, FilterOption[]>;

export type FilterKey = keyof typeof FILTERS;
export const FILTER_KEYS = Object.keys(FILTERS) as FilterKey[];

/** The optional filters, in the order the "More filters" step shows them. */
export const MORE_FILTERS: { key: FilterKey; title: string; hint?: string }[] = [
  { key: "seats", title: "Seats" },
  { key: "drive", title: "Drive" },
  { key: "chemistry", title: "Battery chemistry", hint: "LFP batteries are happy to be charged to 100% every day." },
  { key: "heatPump", title: "Heat pump", hint: "Keeps more of the range in cold weather." },
  { key: "v2l", title: "Vehicle-to-load (V2L)", hint: "Power a kettle, laptop or camping kit from the car." },
  { key: "efficiency", title: "Efficiency", hint: "More miles per kWh means cheaper to run." },
  { key: "oneStop", title: "Motorway trip with one 15-minute charge", hint: "Total distance at motorway speed with one quick stop." },
  { key: "accel", title: "Acceleration (0–62 mph)", hint: `The same as 0–100 km/h. Half the EVs on sale take ${MEDIAN_ACCEL} s or less.` },
];

export const PRIORITIES = [
  { id: "range", label: "Maximum range", hint: "Furthest real-world range first" },
  { id: "efficiency", label: "Higher efficiency", hint: "Most miles per kWh first, which means cheaper to run" },
  { id: "acceleration", label: "Quickest acceleration", hint: "Fastest 0–62 mph first" },
] as const;
export type PriorityId = (typeof PRIORITIES)[number]["id"];
export const priorityOf = (id: PriorityId) => PRIORITIES.find((p) => p.id === id)!;

export type Answers = Record<FilterKey, string> & { priority: PriorityId };

export const DEFAULT_ANSWERS: Answers = {
  ...(Object.fromEntries(FILTER_KEYS.map((k) => [k, FILTERS[k][0].id])) as Record<FilterKey, string>),
  priority: "range",
};

export const optionOf = (key: FilterKey, a: Answers): FilterOption =>
  FILTERS[key].find((o) => o.id === a[key]) ?? FILTERS[key][0];

/** Filters with a real choice made (anything other than "no preference"), with their chip text. */
export function activeFilters(a: Answers): { key: FilterKey; chip: string }[] {
  return FILTER_KEYS.flatMap((key) => {
    const chip = optionOf(key, a).chip;
    return chip ? [{ key, chip }] : [];
  });
}

/** How many of the optional "More filters" are set. */
export const moreFilterCount = (a: Answers) => MORE_FILTERS.filter((f) => optionOf(f.key, a).chip).length;

// ---------- URL (de)serialisation ----------

type Reader = { get(name: string): string | null };

/** Short URL parameter names. */
const PARAM: Record<FilterKey, string> = {
  budget: "budget",
  range: "range",
  body: "body",
  seats: "seats",
  drive: "drive",
  chemistry: "battery",
  heatPump: "heatpump",
  v2l: "v2l",
  efficiency: "eff",
  oneStop: "onestop",
  accel: "accel",
};

// Older links (before the quiz was expanded) used these values.
const LEGACY_RANGE: Record<string, string> = { "under-200": "any", "200-250": "200", "250-300": "250", "300-plus": "300" };

export function answersFromParams(params: Reader): Answers {
  const a = { ...DEFAULT_ANSWERS };
  for (const key of FILTER_KEYS) {
    let v = params.get(PARAM[key]);
    if (key === "range" && v && LEGACY_RANGE[v]) v = LEGACY_RANGE[v];
    if (v && FILTERS[key].some((o) => o.id === v)) a[key] = v;
  }
  const p = params.get("priority");
  if (PRIORITIES.some((o) => o.id === p)) a.priority = p as PriorityId;

  // Legacy "features=heat-pump,v2l,awd,7-seats,lfp"
  for (const f of (params.get("features") ?? "").split(",")) {
    if (f === "heat-pump") a.heatPump = "yes";
    if (f === "v2l") a.v2l = "yes";
    if (f === "awd") a.drive = "awd";
    if (f === "7-seats") a.seats = "7";
    if (f === "lfp") a.chemistry = "lfp";
  }
  return a;
}

export function answersToQuery(a: Answers): string {
  const p = new URLSearchParams({ budget: a.budget, range: a.range, body: a.body, priority: a.priority });
  for (const key of FILTER_KEYS) {
    if (key === "budget" || key === "range" || key === "body") continue;
    if (a[key] !== FILTERS[key][0].id) p.set(PARAM[key], a[key]);
  }
  return p.toString();
}

/** True when the URL carries a full set of answers (used to pre-fill the quiz on "Edit answers"). */
export function hasAnswers(params: Reader): boolean {
  return ["budget", "range", "body"].every((k) => params.get(k) !== null);
}
