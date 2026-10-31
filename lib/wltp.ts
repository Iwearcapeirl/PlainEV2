import { cars, type Car, type UkCar } from "./cars";

/**
 * Real-world range against the official WLTP figure, both from EV Database. Most real-world figures are EV Database's
 * estimates from its own testing model rather than a measured drive, as on the rest of the site. Cars whose figures
 * look inconsistent (real-world above WLTP, or under 60% of it: a handful, all estimates) are left out of the
 * comparison and listed on the page instead.
 */

/** Share of the official WLTP range the car manages in real-world driving (0.79 = 79%), or null. */
export const wltpShare = (c: Pick<Car, "rangeKm" | "wltpKm">) => (c.wltpKm ? c.rangeKm / c.wltpKm : null);

const PLAUSIBLE: [number, number] = [0.6, 1];

/** Whether a car takes part in the WLTP comparison. */
export const comparable = (c: Car) => {
  const s = wltpShare(c);
  return s !== null && s >= PLAUSIBLE[0] && s <= PLAUSIBLE[1];
};

/** Cars on sale in the UK with a WLTP figure that's left out as inconsistent. */
export const wltpOutliers = (): UkCar[] => cars.filter((c) => c.wltpKm && !comparable(c));

/** Cars on sale new in the UK that take part, highest share of WLTP first. */
export const wltpCars: UkCar[] = cars.filter(comparable).sort((a, b) => wltpShare(b)! - wltpShare(a)! || b.rangeKm - a.rangeKm || a.id - b.id);

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** The typical (median) share across every comparable car on sale. */
export const typicalShare = median(wltpCars.map((c) => wltpShare(c)!));

/** Makes with at least this many comparable models on sale get a row in the brand table. */
export const BRAND_MIN_MODELS = 3;

export interface BrandRow {
  make: string;
  /** Model families on sale (comparable ones). */
  models: number;
  versions: number;
  /** Median share of WLTP across the make's versions, and its best and worst version. */
  share: number;
  best: UkCar;
  worst: UkCar;
}

/** The brand a UK buyer sees: Opel's cars are sold here as Vauxhalls (the model family carries the UK name). */
export const brandOf = (c: Car) => (c.make === "Opel" && c.family.startsWith("Vauxhall") ? "Vauxhall" : c.make === "CUPRA" ? "Cupra" : c.make);

/** One row per make with enough models, highest typical share first. */
export const brandRows: BrandRow[] = (() => {
  const byMake = new Map<string, UkCar[]>();
  for (const c of wltpCars) byMake.set(brandOf(c), [...(byMake.get(brandOf(c)) ?? []), c]);
  const rows: BrandRow[] = [];
  for (const [make, list] of byMake) {
    const models = new Set(list.map((c) => c.family)).size;
    if (models < BRAND_MIN_MODELS) continue;
    const sorted = [...list].sort((a, b) => wltpShare(b)! - wltpShare(a)!);
    rows.push({ make, models, versions: list.length, share: median(list.map((c) => wltpShare(c)!)), best: sorted[0], worst: sorted[sorted.length - 1] });
  }
  return rows.sort((a, b) => b.share - a.share || a.make.localeCompare(b.make));
})();

/** "79%" */
export const pct = (share: number) => `${Math.round(share * 100)}%`;

/** Typical share by body style (for the findings), highest first; only body styles with at least 20 cars, so a few
 * exotic convertibles don't decide it. */
export const bodyRows = (): { body: string; cars: number; share: number }[] => {
  const by = new Map<string, number[]>();
  for (const c of wltpCars) by.set(c.body, [...(by.get(c.body) ?? []), wltpShare(c)!]);
  return [...by.entries()]
    .filter(([, v]) => v.length >= 20)
    .map(([body, v]) => ({ body, cars: v.length, share: median(v) }))
    .sort((a, b) => b.share - a.share);
};

/** The share at a given point of the spread (0.25 = the lower quarter), across every comparable car. */
export const shareQuantile = (q: number) => {
  const s = wltpCars.map((c) => wltpShare(c)!).sort((a, b) => a - b);
  return s[Math.floor(q * (s.length - 1))];
};
