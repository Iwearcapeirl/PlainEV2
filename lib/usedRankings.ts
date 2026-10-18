import { allCars, type Car } from "./cars";
import { formatGbp, formatMi } from "./format";
import { usedEstimates, type UsedEstimate } from "./market";
import { DATA_YEAR } from "./site";
import { warrantyOf } from "./warranty";

/**
 * Used-car rankings: second-hand electric cars in the UK within a budget, ranked by the real-world range a
 * typical example has today (after estimated battery wear), one car per model. Prices are estimates from
 * lib/market.ts, so every page says so.
 */

export const USED_BUDGETS = [10_000, 15_000, 20_000, 25_000] as const;
/** The family list's budget (kept to the top budget, so it's about affordable used cars). */
export const FAMILY_BUDGET = 25_000;
export const USED_PER_PAGE = 10;
/** Family cars: SUVs, estates, MPVs and van-based people carriers with 5+ seats and a big boot. */
const FAMILY_BODIES = ["SUV", "Station", "MPV", "SPV"];
const FAMILY_BOOT = 450;
const MIN_ENTRIES = 5;

export interface UsedEntry {
  car: Car;
  /** The newest model year within budget: the one with the most range left. */
  pick: UsedEstimate;
  /** Every model year of this version within budget. */
  yearFrom: number;
  yearTo: number;
}

export interface UsedRankingPage {
  slug: string;
  kind: "used-under" | "used-family";
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  method: string;
  /** Short label for links */
  label: string;
  entries: UsedEntry[];
}

const METHOD =
  "Ranked by estimated real-world range today: the range when new, less about 2% battery wear a year, for the newest model year that fits the budget. One car per model. Used prices are our estimates from the price when new and typical depreciation, not valuations, so check real listings.";

/** Every version's newest model year within the budget, best range today first, one per model family. */
function rank(max: number, test: (c: Car) => boolean = () => true): UsedEntry[] {
  const entries: UsedEntry[] = [];
  for (const car of allCars) {
    // Makes that have closed down (no warranty or parts support) aren't recommended.
    if (car.priceGbp === null || !test(car) || warrantyOf(car)?.closed) continue;
    const fits = usedEstimates(car, "uk").filter((e) => e.low <= max);
    if (!fits.length) continue;
    const years = fits.map((e) => e.year);
    entries.push({ car, pick: fits[0], yearFrom: Math.min(...years), yearTo: Math.max(...years) });
  }
  entries.sort((x, y) => y.pick.rangeTodayKm - x.pick.rangeTodayKm || x.pick.low - y.pick.low || x.car.id - y.car.id);
  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.car.family) ? false : (seen.add(e.car.family), true)));
}

const lead = (e: UsedEntry) => `${e.car.make} ${e.car.variant} (${e.pick.year}), with about ${formatMi(e.pick.rangeTodayKm)} of range today`;

function build(): UsedRankingPage[] {
  const pages: UsedRankingPage[] = [];
  for (const max of USED_BUDGETS) {
    const entries = rank(max);
    const k = `£${max / 1000}k`;
    pages.push({
      slug: `used-under-${max / 1000}k`,
      kind: "used-under",
      label: `Best used EVs under ${k}`,
      metaTitle: `Best used electric cars under ${formatGbp(max)} (${DATA_YEAR})`,
      metaDescription: entries[0]
        ? `The used electric cars you can buy for under ${formatGbp(max)} in the UK that still go furthest today. Number 1 is the ${lead(entries[0])}.`
        : "",
      h1: `Best used electric cars under ${formatGbp(max)} in ${DATA_YEAR}`,
      intro: `${entries.length} electric models can be found second-hand in the UK for under ${formatGbp(max)}, going by our price estimates. These are the ones with the most real-world range left after battery wear.`,
      method: METHOD,
      entries,
    });
  }
  {
    const entries = rank(FAMILY_BUDGET, (c) => FAMILY_BODIES.includes(c.body) && c.seats >= 5 && c.cargoL >= FAMILY_BOOT);
    pages.push({
      slug: "used-family-evs",
      kind: "used-family",
      label: "Best used family EVs",
      metaTitle: `Best used family electric cars under ${formatGbp(FAMILY_BUDGET)} (${DATA_YEAR})`,
      metaDescription: entries[0]
        ? `Used electric SUVs, estates and people carriers with five or more seats and a 450-litre boot, under ${formatGbp(FAMILY_BUDGET)} in the UK, ranked by real-world range today. Number 1 is the ${lead(entries[0])}.`
        : "",
      h1: `Best used family electric cars in ${DATA_YEAR}`,
      intro: `Used electric SUVs, estates and people carriers with at least five seats and a boot of 450 litres or more, for under ${formatGbp(FAMILY_BUDGET)} going by our estimates. ${entries.length} models qualify; these go furthest today.`,
      method: METHOD,
      entries,
    });
  }
  return pages.filter((p) => p.entries.length >= MIN_ENTRIES);
}

export const usedRankingPages: UsedRankingPage[] = build();
export const getUsedRankingPage = (slug: string) => usedRankingPages.find((p) => p.slug === slug);
