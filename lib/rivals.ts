import { bodyNoun, segmentLabel } from "./carProfile";
import { cars, slugify, type UkCar } from "./cars";
import { formatAccel, formatGbp, formatMi, formatMiPerKwh, KM_PER_MILE } from "./format";
import { both } from "./units";
import { warrantyOf } from "./warranty";

/**
 * "X vs Y" pages: each model on sale new in the UK against its two closest rivals (same body style and size class,
 * nearest starting price). A model is represented by its cheapest UK version; the page links to every version.
 */

export interface Rival {
  /** Model family, e.g. "Kia EV6" */
  name: string;
  /** Its cheapest UK version, compared on the page. */
  car: UkCar;
  /** Every UK version on sale, cheapest first. */
  versions: UkCar[];
}

export interface VsPage {
  slug: string;
  /** The two models, in alphabetical order (which is also the order in the URL). */
  a: Rival;
  b: Rival;
}

const RIVALS_PER_MODEL = 2;

const MODELS: Rival[] = (() => {
  const byFamily = new Map<string, UkCar[]>();
  for (const c of cars) byFamily.set(c.family, [...(byFamily.get(c.family) ?? []), c]);
  return [...byFamily.entries()].map(([name, list]) => {
    const versions = [...list].sort((x, y) => x.priceGbp - y.priceGbp || y.rangeKm - x.rangeKm || x.id - y.id);
    return { name, car: versions[0], versions };
  });
})();

export const vsSlug = (a: string, b: string) => `${slugify(a)}-vs-${slugify(b)}`;

/**
 * Well-known rivalries that the nearest-price rule can miss (crowded size classes, or a saloon against an SUV).
 * Always included, and shown first on the rankings hub.
 */
const KNOWN_RIVALS: [string, string][] = [
  ["Hyundai Ioniq 5", "Kia EV6"],
  ["Tesla Model Y", "Hyundai Ioniq 5"],
  ["Tesla Model 3", "Polestar 2"],
  ["Volkswagen ID.3", "MG4"],
  ["Kia EV3", "Škoda Elroq"],
  ["Renault 5 E-Tech", "Mini Cooper Electric"],
  ["Škoda Enyaq", "Volkswagen ID.4"],
  ["Kia EV9", "Hyundai Ioniq 9"],
  ["Tesla Model 3", "BMW i4"],
  ["Tesla Model 3", "Hyundai Ioniq 6"],
  ["Tesla Model Y", "Škoda Enyaq"],
  ["Cupra Born", "Volkswagen ID.3"],
  ["MG4", "BYD Dolphin"],
  ["Kia EV3", "Volvo EX30"],
  ["BYD Atto 3", "MG S5 EV"],
  ["Ford Explorer EV", "Volkswagen ID.4"],
];

const pair = (m: Rival, r: Rival): VsPage => {
  const [a, b] = [m, r].sort((x, y) => x.name.localeCompare(y.name));
  return { slug: vsSlug(a.name, b.name), a, b };
};

export const vsPages: VsPage[] = (() => {
  const seen = new Map<string, VsPage>();
  const model = new Map(MODELS.map((m) => [m.name, m]));
  for (const [x, y] of KNOWN_RIVALS) {
    const [mx, my] = [model.get(x), model.get(y)];
    if (mx && my) seen.set(pair(mx, my).slug, pair(mx, my));
  }
  for (const m of MODELS) {
    const rivals = MODELS.filter((o) => o !== m && o.car.body === m.car.body && o.car.segment === m.car.segment)
      .sort((x, y) => Math.abs(x.car.priceGbp - m.car.priceGbp) - Math.abs(y.car.priceGbp - m.car.priceGbp) || x.name.localeCompare(y.name))
      .slice(0, RIVALS_PER_MODEL);
    for (const r of rivals) {
      const p = pair(m, r);
      if (!seen.has(p.slug)) seen.set(p.slug, p);
    }
  }
  return [...seen.values()].sort((x, y) => x.slug.localeCompare(y.slug));
})();

const BY_SLUG = new Map(vsPages.map((p) => [p.slug, p]));
export const getVsPage = (slug: string) => BY_SLUG.get(slug);

/** The vs pages a model appears in, for "Compare with rivals" on car pages. */
export const vsPagesFor = (family: string) => vsPages.filter((p) => p.a.name === family || p.b.name === family);

/** Well-known match-ups for the rankings hub (the known rivalries that exist in the data). */
export function featuredVsPages(n = 8): VsPage[] {
  return KNOWN_RIVALS.map(([x, y]) => getVsPage(vsSlug(...([x, y].sort((p, q) => p.localeCompare(q)) as [string, string]))))
    .filter((p): p is VsPage => Boolean(p))
    .slice(0, n);
}

// ---------- The written verdict ----------

const miles = (km: number) => Math.round(km / KM_PER_MILE);
/** Within this share of each other, two figures count as "about the same". */
const CLOSE = 0.03;
const close = (x: number, y: number) => Math.abs(x - y) <= CLOSE * Math.max(x, y);
/** "Ioniq 5" from "Hyundai Ioniq 5", unless both are the same make's models with clashing short names. */
const short = (r: Rival) => (r.name.split(" ").length > 1 ? r.name.split(" ").slice(1).join(" ") : r.name);

interface Point {
  /** Which car is better (0 = a, 1 = b), or null when they're about the same. */
  winner: 0 | 1 | null;
  /** e.g. "goes further: 283 miles against 280" */
  text: (w: Rival, l: Rival) => string;
  /** e.g. "range" for "about the same range" */
  same: string;
  /** What a buyer who cares about this wants: "the longest range". */
  want: string;
}

function points(a: UkCar, b: UkCar): Point[] {
  const pick = (x: number, y: number, higher: boolean): 0 | 1 | null => (close(x, y) ? null : (x > y) === higher ? 0 : 1);
  const p: Point[] = [];
  const [ra, rb] = [miles(a.rangeKm), miles(b.rangeKm)];
  const [ka, kb] = [Math.round(a.rangeKm), Math.round(b.rangeKm)];
  p.push({
    winner: pick(a.rangeKm, b.rangeKm, true),
    text: (w, l) =>
      `goes further, with about ${both(`${Math.max(ra, rb)} miles`, `${Math.max(ka, kb)} km`)} of real-world range against ${both(String(Math.min(ra, rb)), String(Math.min(ka, kb)))} for the ${short(l)}`,
    same: ra === rb ? `real-world range (about ${both(`${ra} miles`, `${ka} km`)} each)` : `real-world range (about ${both(`${ra} and ${rb} miles`, `${ka} and ${kb} km`)})`,
    want: "the longest range",
  });
  p.push({
    winner: pick(a.priceGbp, b.priceGbp, false),
    text: (w, l) => `is ${formatGbp(Math.abs(a.priceGbp - b.priceGbp))} cheaper to buy new (${formatGbp(Math.min(a.priceGbp, b.priceGbp))} against ${formatGbp(Math.max(a.priceGbp, b.priceGbp))})`,
    same: "price",
    want: "the lower price",
  });
  p.push({
    winner: pick(a.fastchargeKw, b.fastchargeKw, true),
    text: () => `charges faster on a rapid charger (${Math.max(a.fastchargeKw, b.fastchargeKw)} kW against ${Math.min(a.fastchargeKw, b.fastchargeKw)} kW on average, 10–80%)`,
    same: "rapid-charging speed",
    want: "quicker charging stops",
  });
  p.push({
    winner: pick(a.whPerKm, b.whPerKm, false),
    text: () => `uses less energy (${formatMiPerKwh(Math.min(a.whPerKm, b.whPerKm))} against ${formatMiPerKwh(Math.max(a.whPerKm, b.whPerKm))})`,
    same: "efficiency",
    want: "lower running costs",
  });
  if (a.cargoL > 0 && b.cargoL > 0) {
    p.push({
      winner: pick(a.cargoL, b.cargoL, true),
      text: () => `has the bigger boot (${Math.max(a.cargoL, b.cargoL)} litres against ${Math.min(a.cargoL, b.cargoL)})`,
      same: "boot space",
      want: "more boot space",
    });
  }
  p.push({
    winner: pick(a.accelS, b.accelS, false),
    text: () => `is quicker, doing 0–62 mph in ${formatAccel(Math.min(a.accelS, b.accelS))} against ${formatAccel(Math.max(a.accelS, b.accelS))}`,
    same: "acceleration",
    want: "more performance",
  });
  const [wa, wb] = [warrantyOf(a)?.car?.years ?? null, warrantyOf(b)?.car?.years ?? null];
  if (wa !== null && wb !== null) {
    p.push({
      winner: wa === wb ? null : wa > wb ? 0 : 1,
      text: () => `has the longer warranty (${Math.max(wa, wb)} years against ${Math.min(wa, wb)})`,
      same: `warranty length (${wa} years)`,
      want: "a longer warranty",
    });
  }
  return p;
}

const list = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A few short paragraphs comparing the two, written from the figures. */
export function verdict(page: VsPage): string[] {
  const { a, b } = page;
  const pts = points(a.car, b.car);
  const rivals = [a, b];
  const wins = [0, 1].map((i) => pts.filter((p) => p.winner === i));
  const same = pts.filter((p) => p.winner === null).map((p) => p.same);

  const intro =
    `The ${a.name} and ${b.name} are both electric ${bodyNoun(a.car.body)}s in the ${segmentLabel(a.car.segment).replace(/^[A-Z] · /, "").toLowerCase()} class. ` +
    `The ${a.name} starts at ${formatGbp(a.car.priceGbp)} in the UK and the ${b.name} at ${formatGbp(b.car.priceGbp)}` +
    `${a.versions.length + b.versions.length > 2 ? ", comparing the cheapest version of each" : ""}.`;

  const body = [0, 1]
    .filter((i) => wins[i].length > 0)
    .map((i) => {
      const w = rivals[i];
      const l = rivals[1 - i];
      const [first, ...rest] = wins[i];
      return `The ${short(w)} ${first.text(w, l)}.${rest.length ? ` On top of that, it ${list(rest.map((p) => p.text(w, l)))}.` : ""}`;
    });
  if (same.length) body.push(`There's little between them on ${list(same)}.`);

  const choose = [0, 1]
    .filter((i) => wins[i].length > 0)
    .map((i) => `the ${rivals[i].name} if you want ${list(wins[i].slice(0, 2).map((p) => p.want))}`);
  const close_ = choose.length ? `Choose ${list(choose)}.` : "On these figures they're very evenly matched, so it comes down to how they look, drive and feel inside.";

  return [intro, ...body, close_].map(capital);
}

/** "Kia EV6 vs Hyundai Ioniq 5" */
export const vsTitle = (p: VsPage) => `${p.a.name} vs ${p.b.name}`;
/** First line of the verdict that names a winner, for the meta description. */
export const vsDescription = (p: VsPage) =>
  `${vsTitle(p)}: real-world range, price, charging, boot space and warranty compared side by side. ` +
  `${p.a.name} from ${formatGbp(p.a.car.priceGbp)}, ${formatMi(p.a.car.rangeKm)}; ${p.b.name} from ${formatGbp(p.b.car.priceGbp)}, ${formatMi(p.b.car.rangeKm)}.`;
