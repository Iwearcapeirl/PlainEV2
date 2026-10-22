import { allCars, type Car } from "./cars";
import { bodyLabel, CHEMISTRY_LABEL, driveLabel, segmentLabel } from "./carProfile";
import { feetInches, formatAccel, formatKm, formatMi, formatMiPerKwh, formatWhPerKm, KM_PER_MILE, metres } from "./format";
import { COUNTRIES, formatMoney, newPrice, soldNew, usedFrom, type Country, formatBand } from "./market";
import { termScore, TRANSFER_LABEL, warrantyOf } from "./warranty";

/**
 * "Compare": up to three cars side by side, row by row, with the best figure in each row marked.
 *
 * Who wins a row:
 * - "high": the highest number wins (range, charging speed, boot …); "low": the lowest (prices, 0–62 mph, Wh/km).
 * - "yes": yes/no features; the cars with "Yes" win.
 * - Rows with no "better" (body, plug, chemistry, weight …) are just shown.
 * Every car tied for best wins. A missing figure never wins, a row needs at least two cars with a figure, and a row
 * where every car has the same figure has no winner (nothing to choose between them).
 */

export const MAX_COMPARE = 3;

export type Better = "high" | "low" | "yes";

export interface Cell {
  /** What's shown, e.g. "312 mi" */
  text: string;
  /** Smaller second line, e.g. "502 km" */
  sub?: string;
  /** The figure compared; null when it's missing (never wins). */
  n: number | null;
}

export interface CompareRow {
  key: string;
  label: string;
  better?: Better;
  cell: (car: Car, country: Country) => Cell;
}

export interface CompareGroup {
  title: string;
  rows: CompareRow[];
}

const countryName = (c: Country) => (c === "uk" ? "the UK" : c === "nl" ? "the Netherlands" : COUNTRIES[c].label);
const int = (n: number) => n.toLocaleString("en-GB");
const yesNo = (b: boolean): Cell => ({ text: b ? "Yes" : "No", n: b ? 1 : 0 });
const info = (text: string, sub?: string): Cell => ({ text, sub, n: null });
/** Car or battery warranty: longer wins (years first, then miles). */
function warrantyCell(c: Car, which: "car" | "battery"): Cell {
  const w = warrantyOf(c);
  const t = w?.[which];
  if (!w || w.closed || !t || t.years === null) return { text: "–", sub: w?.closed ? "maker closed" : "not confirmed", n: null };
  const miles = t.miles === "unlimited" ? "unlimited miles" : t.miles === null ? undefined : `${int(t.miles)} miles`;
  const pct = which === "battery" && w.battery?.capacity != null ? `${w.battery.capacity}% capacity` : undefined;
  return { text: `${t.years} years`, sub: [miles, pct].filter(Boolean).join(", ") || undefined, n: termScore(t) };
}

/** Sizes are shown but never "win": bigger or smaller isn't better in itself. */
const sizeCell = (mm: number | null): Cell => (mm === null ? { text: "–", n: null } : { text: metres(mm), sub: feetInches(mm), n: null });

/** New price in the country, with what kind of price it is. */
function priceNew(c: Car, country: Country): Cell {
  const p = newPrice(c, country);
  if (p === null) return { text: "–", sub: `not sold in ${countryName(country)}`, n: null };
  const sub = soldNew(c, country) ? "on sale now" : c.status === "Upcoming" ? "expected" : "when new";
  return { text: formatMoney(p, country), sub, n: p };
}

/** Cheapest used example (the oldest model year), estimated. */
function priceUsed(c: Car, country: Country): Cell {
  if (c.status === "Upcoming") return { text: "–", sub: "not out yet", n: null };
  const u = usedFrom(c, country);
  if (!u) return { text: "–", sub: newPrice(c, country) === null ? `not sold in ${countryName(country)}` : "too new", n: null };
  return { text: formatBand(u.low, u.high, country), sub: `${u.year} car, est.`, n: u.high };
}

/** New price per mile (UK) or per km (Germany, Netherlands) of real-world range. */
function pricePerDistance(c: Car, country: Country): Cell {
  const p = newPrice(c, country);
  if (p === null) return { text: "–", n: null };
  const per = country === "uk" ? p / (c.rangeKm / KM_PER_MILE) : p / c.rangeKm;
  const rounded = Math.round(per);
  return { text: formatMoney(rounded, country), n: rounded };
}

function rangeToday(c: Car, country: Country): Cell {
  const u = c.status === "Upcoming" ? null : usedFrom(c, country);
  if (!u) return { text: "–", n: null };
  return { text: `about ${formatMi(u.rangeTodayKm)}`, sub: `${u.year} car, est.`, n: u.rangeTodayKm };
}

const yearsText = (c: Car) => (c.yearTo ? (c.yearTo === c.yearFrom ? `${c.yearFrom}` : `${c.yearFrom}–${c.yearTo}`) : `${c.yearFrom} on`);

export const statusText = (c: Car) =>
  c.status === "Upcoming" ? "Coming soon" : c.status === "Discontinued" ? "No longer sold new" : "On sale new";

export function compareGroups(country: Country): CompareGroup[] {
  const perLabel = country === "uk" ? "Price per mile of range" : "Price per km of range";
  return [
    {
      title: "Price",
      rows: [
        { key: "price", label: "Price new", better: "low", cell: priceNew },
        { key: "used", label: "Used from (estimated)", better: "low", cell: priceUsed },
        { key: "perDistance", label: perLabel, better: "low", cell: pricePerDistance },
      ],
    },
    {
      title: "Range and efficiency",
      rows: [
        { key: "range", label: "Real-world range", better: "high", cell: (c) => ({ text: formatMi(c.rangeKm), sub: `${formatKm(c.rangeKm)}${c.rangeEstimated ? ", estimate" : ""}`, n: c.rangeKm }) },
        { key: "rangeToday", label: "Range today, used (estimated)", better: "high", cell: rangeToday },
        { key: "efficiency", label: "Efficiency", better: "low", cell: (c) => ({ text: formatMiPerKwh(c.whPerKm), sub: `${formatWhPerKm(c.whPerKm)}${c.efficiencyEstimated ? ", estimate" : ""}`, n: c.whPerKm }) },
        { key: "oneStop", label: "Range with one 15-min stop", better: "high", cell: (c) => ({ text: formatMi(c.oneStopKm), sub: formatKm(c.oneStopKm), n: c.oneStopKm }) },
      ],
    },
    {
      title: "Charging",
      rows: [
        { key: "rapid", label: "Rapid charging", better: "high", cell: (c) => ({ text: `${c.fastchargeKw} kW`, sub: "10–80% average", n: c.fastchargeKw }) },
        { key: "ac", label: "Home (AC) charging", better: "high", cell: (c) => ({ text: `${c.acChargeKw} kW`, n: c.acChargeKw }) },
        { key: "plug", label: "Charging plug", cell: (c) => info(c.chargePlug) },
        { key: "v2l", label: "Vehicle-to-load (V2L)", better: "yes", cell: (c) => yesNo(c.v2l) },
        { key: "v2h", label: "Vehicle-to-home (V2H)", better: "yes", cell: (c) => yesNo(c.v2h) },
        { key: "v2g", label: "Vehicle-to-grid (V2G)", better: "yes", cell: (c) => yesNo(c.v2g) },
      ],
    },
    {
      title: "Battery",
      rows: [
        { key: "battery", label: "Usable battery", better: "high", cell: (c) => ({ text: `${c.batteryKwh} kWh`, sub: c.batteryEstimated ? "estimate" : undefined, n: c.batteryKwh }) },
        { key: "chemistry", label: "Battery chemistry", cell: (c) => info(c.chemistry ? (CHEMISTRY_LABEL[c.chemistry] ?? c.chemistry) : "Not listed") },
        { key: "heatPump", label: "Heat pump", better: "yes", cell: (c) => yesNo(c.heatPump) },
      ],
    },
    {
      title: "Body and performance",
      rows: [
        { key: "body", label: "Body style", cell: (c) => info(bodyLabel(c.body)) },
        { key: "segment", label: "Size class", cell: (c) => info(segmentLabel(c.segment)) },
        { key: "seats", label: "Seats", better: "high", cell: (c) => ({ text: String(c.seats), n: c.seats }) },
        { key: "drive", label: "Drive", cell: (c) => info(driveLabel(c.drive)) },
        { key: "accel", label: "0–62 mph", better: "low", cell: (c) => ({ text: formatAccel(c.accelS), sub: "0–100 km/h", n: c.accelS }) },
        { key: "weight", label: "Weight", cell: (c) => info(`${int(c.weightKg)} kg`) },
      ],
    },
    {
      title: "Size",
      rows: [
        { key: "length", label: "Length", cell: (c) => sizeCell(c.lengthMm) },
        { key: "width", label: "Width (without mirrors)", cell: (c) => sizeCell(c.widthMm) },
        { key: "widthMirrors", label: "Width with mirrors", cell: (c) => sizeCell(c.widthMirrorsMm) },
        { key: "height", label: "Height", cell: (c) => sizeCell(c.heightMm) },
        { key: "wheelbase", label: "Wheelbase", cell: (c) => sizeCell(c.wheelbaseMm) },
      ],
    },
    {
      title: "Practicality and safety",
      rows: [
        { key: "boot", label: "Boot space", better: "high", cell: (c) => ({ text: `${int(c.cargoL)} litres`, n: c.cargoL }) },
        { key: "towbar", label: "Towbar available", better: "yes", cell: (c) => yesNo(c.towbar) },
        { key: "towing", label: "Towing (braked)", better: "high", cell: (c) => (c.towingKg > 0 ? { text: `${int(c.towingKg)} kg`, n: c.towingKg } : { text: "Not approved", n: 0 }) },
        { key: "payload", label: "Max payload", better: "high", cell: (c) => (c.payloadKg !== null ? { text: `${int(c.payloadKg)} kg`, sub: "people and luggage", n: c.payloadKg } : { text: "–", n: null }) },
        { key: "ncap", label: "Euro NCAP rating", better: "high", cell: (c) => (c.ncapStars !== null ? { text: `${c.ncapStars} stars`, n: c.ncapStars } : { text: "–", sub: "not tested yet", n: null }) },
      ],
    },
    {
      title: "Warranty (UK)",
      rows: [
        { key: "carWarranty", label: "Car warranty", better: "high", cell: (c) => warrantyCell(c, "car") },
        { key: "batteryWarranty", label: "Battery warranty", better: "high", cell: (c) => warrantyCell(c, "battery") },
        { key: "transfer", label: "Passes to next owner", cell: (c) => { const w = warrantyOf(c); return info(w && !w.closed ? TRANSFER_LABEL[w.transfer] : "–"); } },
      ],
    },
    {
      title: "Availability",
      rows: [
        { key: "status", label: "Status", cell: (c) => info(statusText(c)) },
        { key: "years", label: "Model years", cell: (c) => info(yearsText(c)) },
      ],
    },
  ];
}

/**
 * Which of the cells win: the same length as `cells`, true for every car tied for the best figure. Empty slots
 * (null) and missing figures never win.
 */
export function winners(better: Better | undefined, cells: (Cell | null)[]): boolean[] {
  const none = cells.map(() => false);
  if (!better) return none;
  const ns = cells.map((c) => (c && c.n !== null ? c.n : null));
  const present = ns.filter((n): n is number => n !== null);
  if (present.length < 2) return none;
  const best = better === "low" ? Math.min(...present) : Math.max(...present);
  if (present.every((n) => n === best)) return none;
  return ns.map((n) => n === best);
}

export interface CompareTable {
  groups: { title: string; rows: { key: string; label: string; better?: Better; cells: (Cell | null)[]; wins: boolean[] }[] }[];
  /** Rows wins for each slot, and the number of rows that have a winner at all. */
  tally: { wins: number[]; of: number };
}

/** The full comparison for the slots (null = empty slot). */
export function compareTable(slots: (Car | null)[], country: Country): CompareTable {
  const wins = slots.map(() => 0);
  let of = 0;
  const groups = compareGroups(country).map((g) => ({
    title: g.title,
    rows: g.rows.map((r) => {
      const cells = slots.map((car) => (car ? r.cell(car, country) : null));
      const w = winners(r.better, cells);
      if (w.some(Boolean)) {
        of++;
        w.forEach((x, i) => x && wins[i]++);
      }
      return { key: r.key, label: r.label, better: r.better, cells, wins: w };
    }),
  }));
  return { groups, tally: { wins, of } };
}

// ---------- Picking cars ----------

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Each car's searchable text, with and without spaces (so "ioniq5" finds "IONIQ 5"). */
const INDEX = allCars.map((car) => {
  const text = norm(`${car.make} ${car.model} ${car.family} ${car.yearFrom} ${car.yearTo ?? ""}`);
  return { car, text, squashed: text.replace(/ /g, ""), name: norm(`${car.make} ${car.model}`) };
});

const STATUS_ORDER: Record<Car["status"], number> = { Available: 0, Discontinued: 1, Upcoming: 2 };

/**
 * Cars matching what's typed: every word must appear (in any order). Names that start with the query come first,
 * then cars on sale, then newer ones.
 */
export function searchCars(query: string, exclude: ReadonlySet<number> = new Set(), limit = 12): { results: Car[]; total: number } {
  const q = norm(query);
  if (!q) return { results: [], total: 0 };
  const words = q.split(" ");
  const matches = INDEX.filter(
    (e) => !exclude.has(e.car.id) && words.every((w) => e.text.includes(w) || e.squashed.includes(w)),
  );
  const starts = (e: (typeof INDEX)[number]) => (e.name.startsWith(q) || e.name.slice(e.car.make.length + 1).startsWith(q) ? 0 : 1);
  matches.sort(
    (a, b) =>
      starts(a) - starts(b) ||
      STATUS_ORDER[a.car.status] - STATUS_ORDER[b.car.status] ||
      b.car.yearFrom - a.car.yearFrom ||
      a.name.localeCompare(b.name),
  );
  return { results: matches.slice(0, limit).map((e) => e.car), total: matches.length };
}

/** "/compare?cars=a,b,c" — empty slots stay in place ("a,,c"), so the cars keep their columns. */
export function compareHref(slugs: (string | null)[], country?: Country | null): string {
  const list = [...slugs];
  while (list.length && !list[list.length - 1]) list.pop();
  const p = new URLSearchParams();
  if (list.length) p.set("cars", list.map((s) => s ?? "").join(","));
  if (country && country !== "uk") p.set("country", country);
  const q = p.toString().replace(/%2C/g, ",");
  return q ? `/compare?${q}` : "/compare";
}

const BY_SLUG = new Map(allCars.map((c) => [c.slug, c]));

/** The slots from a "cars" parameter: unknown or repeated cars leave their slot empty. */
export function slotsFromParam(param: string | null): (Car | null)[] {
  const seen = new Set<number>();
  const slugs = (param ?? "").split(",").slice(0, MAX_COMPARE);
  const slots: (Car | null)[] = [];
  for (let i = 0; i < MAX_COMPARE; i++) {
    const car = BY_SLUG.get((slugs[i] ?? "").trim()) ?? null;
    if (car && !seen.has(car.id)) {
      seen.add(car.id);
      slots.push(car);
    } else slots.push(null);
  }
  return slots;
}

export { yearsText };
