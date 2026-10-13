import type { Car } from "./cars";
import { activeFilters, DEFAULT_ANSWERS, FILTER_KEYS, optionOf, type Answers, type FilterKey, type PriorityId } from "./quiz";

/** Cars whose real-world ranges are within this many km of each other count as "very close". */
export const RANGE_TIE_KM = 10;

/** A car matches when it passes every filter (filters left on "no preference" always pass). */
export function matchesAnswers(car: Car, a: Answers): boolean {
  return FILTER_KEYS.every((key) => optionOf(key, a).test(car));
}

/** The filters the user set, each of which this car meets (for the "matches" chips on result cards). */
export function matchedFilters(car: Car, a: Answers): { key: FilterKey; chip: string }[] {
  return activeFilters(a).filter((f) => optionOf(f.key, a).test(car));
}

const byRangeDesc = (x: Car, y: Car) => y.rangeKm - x.rangeKm;
const byPricePerKm = (x: Car, y: Car) => x.pricePerKmEur - y.pricePerKmEur;
const byId = (x: Car, y: Car) => x.id - y.id;
const chain =
  (...cmps: ((x: Car, y: Car) => number)[]) =>
  (x: Car, y: Car) => {
    for (const c of cmps) {
      const d = c(x, y);
      if (d !== 0) return d;
    }
    return 0;
  };

/**
 * Range mode: highest real-world range first. Cars are grouped into "close range" bands.
 * Each band starts at the highest remaining range and takes in every car within RANGE_TIE_KM of it.
 * Inside a band, the cheaper price-per-km comes first.
 *
 * Efficiency mode: lowest Wh/km (= most mi/kWh) first, then highest range.
 */
export function rankCars(list: Car[], priority: PriorityId): Car[] {
  if (priority === "efficiency") {
    return [...list].sort(chain((x, y) => x.whPerKm - y.whPerKm, byRangeDesc, byPricePerKm, byId));
  }

  const sorted = [...list].sort(chain(byRangeDesc, byPricePerKm, byId));
  const out: Car[] = [];
  let i = 0;
  while (i < sorted.length) {
    const anchor = sorted[i].rangeKm;
    let j = i;
    while (j < sorted.length && anchor - sorted[j].rangeKm <= RANGE_TIE_KM) j++;
    out.push(...sorted.slice(i, j).sort(chain(byPricePerKm, byRangeDesc, byId)));
    i = j;
  }
  return out;
}

export interface MatchResult {
  total: number;
  top: Car[];
}

export function findMatches(all: Car[], a: Answers, limit = 5): MatchResult {
  const matching = all.filter((c) => matchesAnswers(c, a));
  return { total: matching.length, top: rankCars(matching, a.priority).slice(0, limit) };
}

export interface Relaxation {
  label: string;
  answers: Answers;
  count: number;
}

const RELAX_LABEL: Partial<Record<FilterKey, string>> = {
  budget: "Remove the budget limit",
  range: "Accept any range",
  body: "Allow any body style",
};

/** When nothing matches, check which single filter, if removed, brings cars back. */
export function suggestRelaxations(all: Car[], a: Answers): Relaxation[] {
  const options = activeFilters(a).map(({ key, chip }) => ({
    label: RELAX_LABEL[key] ?? `Drop “${chip}”`,
    answers: { ...a, [key]: DEFAULT_ANSWERS[key] } as Answers,
  }));
  return options
    .filter((o) => JSON.stringify(o.answers) !== JSON.stringify(a))
    .map((o) => ({ ...o, count: all.filter((c) => matchesAnswers(c, o.answers)).length }))
    .filter((o) => o.count > 0)
    .sort((x, y) => y.count - x.count);
}
