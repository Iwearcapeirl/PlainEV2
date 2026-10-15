// Rankings are of cars on sale new in the UK, so every car here has a UK price.
import { cars as allCars, type UkCar as Car } from "./cars";
import { formatDistance, formatEfficiency, formatGbp, kmToMiles } from "./format";
import { DATA_YEAR } from "./site";

/** A page is only generated when at least this many cars match. */
export const MIN_CARS_PER_PAGE = 5;
/** How many cars each ranking page lists. */
export const CARS_PER_PAGE = 10;

export const PRICE_POINTS = [30_000, 40_000, 50_000, 70_000] as const;

export const BODY_PAGES = [
  { body: "SUV", slug: "suvs", noun: "SUVs" },
  { body: "Hatchback", slug: "hatchbacks", noun: "hatchbacks" },
  { body: "Sedan", slug: "saloons", noun: "saloons" },
  { body: "Liftback", slug: "liftbacks", noun: "liftbacks" },
  { body: "Station", slug: "estates", noun: "estate cars" },
] as const;

/** Which metric a page is ranked by and highlights. */
export type RankingMetric = "range" | "efficiency" | "value";

export type RankingKind = "range-under" | "most-efficient" | "value-under" | "lfp" | "seven-seat";

export interface RankingPage {
  slug: string;
  kind: RankingKind;
  metric: RankingMetric;
  /** <title> (the layout appends " · PlainEV") */
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  method: string;
  /** All matching cars, already ranked. */
  ranked: Car[];
}

// ---------- Ranking helpers ----------

/** UK price per km of real-world range, in GBP (same order as price per mile; used for sorting). */
export const gbpPerKm = (c: Car) => c.priceGbp / c.rangeKm;

/** Highest real range first; ties go to the lower UK £ per km, then the lower price. */
export const byRange = (a: Car, b: Car) =>
  b.rangeKm - a.rangeKm || gbpPerKm(a) - gbpPerKm(b) || a.priceGbp - b.priceGbp || a.id - b.id;

/** Lowest Wh/km first; ties go to the higher real range. */
export const byEfficiency = (a: Car, b: Car) => a.whPerKm - b.whPerKm || byRange(a, b);

/** Real ranges within this many km of each other count as a tie on the value pages. */
export const VALUE_TIE_KM = 10;

/**
 * Value ranking: real range first, with UK £ per km as the tie-break for cars whose ranges are close.
 * Bands start at the highest remaining range and take in every car within VALUE_TIE_KM of it.
 * Inside a band, the lower £ per km comes first.
 */
export function rankByValue(list: Car[]): Car[] {
  const sorted = [...list].sort(byRange);
  const out: Car[] = [];
  for (let i = 0; i < sorted.length; ) {
    const anchor = sorted[i].rangeKm;
    let j = i;
    while (j < sorted.length && anchor - sorted[j].rangeKm <= VALUE_TIE_KM) j++;
    out.push(...sorted.slice(i, j).sort((a, b) => gbpPerKm(a) - gbpPerKm(b) || byRange(a, b)));
    i = j;
  }
  return out;
}

const METHOD_RANGE = "Ranked by real-world range (not WLTP). Prices are starting prices in the UK.";
const METHOD_EFFICIENCY =
  "Ranked by real-world efficiency in miles per kWh (not WLTP); higher is better, with real-world range as the tie-break. Prices are starting prices in the UK.";
const METHOD_VALUE =
  `Ranked by real-world range (not WLTP). Cars within ${kmToMiles(VALUE_TIE_KM)} miles (${VALUE_TIE_KM} km) of each other are ordered by UK price per mile of range. Prices are starting prices in the UK.`;

const priceLabel = (p: number) => formatGbp(p);
const topLine = (c: Car) => `${c.make} ${c.model}, with ${formatDistance(c.rangeKm)}`;

// ---------- Page definitions ----------

function build(): RankingPage[] {
  const pages: RankingPage[] = [];

  for (const p of PRICE_POINTS) {
    const ranked = allCars.filter((c) => c.priceGbp <= p).sort(byRange);
    const lead = ranked[0];
    pages.push({
      slug: `real-range-under-${p}`,
      kind: "range-under",
      metric: "range",
      metaTitle: `Best real-world range EVs under ${priceLabel(p)} (${DATA_YEAR})`,
      metaDescription: lead
        ? `The ${Math.min(ranked.length, CARS_PER_PAGE)} electric cars under ${priceLabel(p)} in the UK that go furthest in real-world driving. Number 1 is the ${topLine(lead)}.`
        : "",
      h1: `Best real-world range EVs under ${priceLabel(p)} in ${DATA_YEAR}`,
      intro: `${ranked.length} electric cars on sale in the UK start at ${priceLabel(p)} or less. These are the ones that go furthest on a charge in real-world driving.`,
      method: METHOD_RANGE,
      ranked,
    });
  }

  for (const b of BODY_PAGES) {
    const ranked = allCars.filter((c) => c.body === b.body).sort(byEfficiency);
    const lead = ranked[0];
    pages.push({
      slug: `most-efficient-${b.slug}`,
      kind: "most-efficient",
      metric: "efficiency",
      metaTitle: `Most efficient electric ${b.noun} (${DATA_YEAR})`,
      metaDescription: lead
        ? `The most energy-efficient electric ${b.noun} on sale in the UK, ranked by real-world miles per kWh. Number 1 is the ${lead.make} ${lead.model} at ${formatEfficiency(lead.whPerKm)}.`
        : "",
      h1: `Most efficient electric ${b.noun} in ${DATA_YEAR}`,
      intro: `Of the ${ranked.length} electric ${b.noun} on sale in the UK, these use the least energy per mile. More miles per kWh means lower running costs and more miles from each charge.`,
      method: METHOD_EFFICIENCY,
      ranked,
    });
  }

  for (const p of PRICE_POINTS) {
    const ranked = rankByValue(allCars.filter((c) => c.priceGbp <= p));
    const lead = ranked[0];
    pages.push({
      slug: `best-value-under-${p}`,
      kind: "value-under",
      metric: "value",
      metaTitle: `Best value EVs under ${priceLabel(p)} (${DATA_YEAR})`,
      metaDescription: lead
        ? `The best value electric cars under ${priceLabel(p)} in the UK, ranked by real-world range and price per mile. Number 1 is the ${topLine(lead)}, from ${formatGbp(lead.priceGbp)}.`
        : "",
      h1: `Best value EVs under ${priceLabel(p)} in ${DATA_YEAR}`,
      intro: `These are the electric cars under ${priceLabel(p)} that go furthest in real-world driving, picked from ${ranked.length} cars on sale in the UK. When two cars have similar range, the one with the lower price per mile of range ranks higher.`,
      method: METHOD_VALUE,
      ranked,
    });
  }

  {
    const ranked = allCars.filter((c) => c.chemistry === "LFP").sort(byRange);
    const lead = ranked[0];
    pages.push({
      slug: "lfp-evs",
      kind: "lfp",
      metric: "range",
      metaTitle: `Best LFP battery EVs by real-world range (${DATA_YEAR})`,
      metaDescription: lead
        ? `Electric cars on sale in the UK with LFP batteries, ranked by real-world range. Number 1 is the ${topLine(lead)}.`
        : "",
      h1: `Best LFP battery EVs in ${DATA_YEAR}, ranked by real range`,
      intro: `${ranked.length} electric cars on sale in the UK use LFP (lithium iron phosphate) batteries. LFP batteries are happy to be charged to 100% every day and tend to last a long time.`,
      method: METHOD_RANGE,
      ranked,
    });
  }

  {
    const ranked = allCars.filter((c) => c.seats >= 7).sort(byRange);
    const lead = ranked[0];
    pages.push({
      slug: "7-seat-evs",
      kind: "seven-seat",
      metric: "range",
      metaTitle: `Best 7-seat EVs by real-world range (${DATA_YEAR})`,
      metaDescription: lead
        ? `Seven-seat electric cars on sale in the UK, ranked by real-world range. Number 1 is the ${topLine(lead)}.`
        : "",
      h1: `Best 7-seat EVs in ${DATA_YEAR}, ranked by real range`,
      intro: `${ranked.length} electric cars on sale in the UK seat seven. These go furthest in real-world driving.`,
      method: METHOD_RANGE,
      ranked,
    });
  }

  return pages.filter((p) => p.ranked.length >= MIN_CARS_PER_PAGE);
}

export const rankingPages: RankingPage[] = build();

export function getRankingPage(slug: string): RankingPage | undefined {
  return rankingPages.find((p) => p.slug === slug);
}

/** Up to `n` other pages, preferring the same kind first (for "More rankings" links). */
export function relatedPages(page: RankingPage, n = 6): RankingPage[] {
  const others = rankingPages.filter((p) => p.slug !== page.slug);
  return [...others.filter((p) => p.kind === page.kind), ...others.filter((p) => p.kind !== page.kind)].slice(0, n);
}

export const SECTIONS: { title: string; kinds: RankingKind[] }[] = [
  { title: "Real-world range by budget", kinds: ["range-under"] },
  { title: "Best value by budget", kinds: ["value-under"] },
  { title: "Most efficient by body style", kinds: ["most-efficient"] },
  { title: "Other rankings", kinds: ["lfp", "seven-seat"] },
];

/** Short link label for index pages and related links. */
export function shortLabel(p: RankingPage): string {
  return p.h1.replace(` in ${DATA_YEAR}`, "").replace(`, ranked by real range`, "");
}
