import type { Car } from "./cars";
import { describe, fieldByKey, isSet, refine, type CustomFilter, type Refinement } from "./fields";
import { activeFilters, BUDGETS, DEFAULT_ANSWERS, FILTER_KEYS, optionOf, type Answers, type FilterKey, type PriorityId } from "./quiz";

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
 *
 * Acceleration mode: quickest 0–62 mph first, then highest range.
 */
export function rankCars(list: Car[], priority: PriorityId): Car[] {
  if (priority === "acceleration") {
    return [...list].sort(chain((x, y) => x.accelS - y.accelS, byRangeDesc, byPricePerKm, byId));
  }
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

// ---------- No results: one change that brings cars back ----------

export interface SearchRelaxation {
  label: string;
  answers: Answers;
  refinement: Refinement;
  /** Cars shown after this change. */
  count: number;
}

/** Budget bands from lowest ceiling to none, for "raise the budget". */
const BUDGET_STEPS = ["under-30k", "30-40k", "40-50k", "50-70k", "no-limit"];

/**
 * When the quiz answers plus any extra filters (from a search or the "Filter and sort" panel) leave no cars,
 * suggest single changes that bring some back, each with how many cars it would show:
 * - budget: raise it to the next band that has matches (or remove the limit);
 * - other quiz answers: set back to "no preference";
 * - number filters (towing, boot space, price…): loosen to the nearest value a matching car actually has;
 * - any extra filter: drop it.
 */
export function relaxSearch(all: Car[], a: Answers, r: Refinement): SearchRelaxation[] {
  const shown = (a2: Answers, r2: Refinement) =>
    refine(rankCars(all.filter((c) => matchesAnswers(c, a2)), a2.priority), r2).length;
  const out: SearchRelaxation[] = [];
  const push = (label: string, answers: Answers, refinement: Refinement) => {
    const count = shown(answers, refinement);
    if (count > 0 && !out.some((o) => o.label === label)) out.push({ label, answers, refinement, count });
  };

  for (const { key, chip } of activeFilters(a)) {
    if (key === "budget") {
      for (const id of BUDGET_STEPS.slice(BUDGET_STEPS.indexOf(a.budget) + 1)) {
        const next = { ...a, budget: id };
        if (shown(next, r) === 0) continue;
        const ceiling = BUDGETS.find((o) => o.id === id)?.chip;
        push(ceiling ? `Raise the budget to ${ceiling.replace(/^Up to /, "")}` : "Remove the budget limit", next, r);
        break;
      }
    } else {
      push(RELAX_LABEL[key] ?? `Drop “${chip}”`, { ...a, [key]: DEFAULT_ANSWERS[key] } as Answers, r);
    }
  }

  const set = r.filters.filter(isSet);
  for (const f of set) {
    const field = fieldByKey(f.key);
    if (!field) continue;
    const others = set.filter((x) => x !== f);
    if (field.kind === "number") {
      // Cars that pass everything except this filter: how close do they get?
      const pool = refine(rankCars(all.filter((c) => matchesAnswers(c, a)), a.priority), { ...r, filters: others });
      const values = pool.map((c) => field.get(c)).filter((v): v is number => v !== null);
      const [lo = "", hi = ""] = f.value.split("~");
      const swap = (value: string) => {
        const next: CustomFilter = { key: f.key, value };
        push(`Change to “${describe(next)}”`, a, { ...r, filters: [...others, next] });
      };
      if (lo !== "") {
        const below = values.filter((v) => v < Number(lo));
        if (below.length) swap(`${Math.max(...below)}~${hi}`);
      }
      if (hi !== "") {
        const above = values.filter((v) => v > Number(hi));
        if (above.length) swap(`${lo}~${Math.min(...above)}`);
      }
    }
    push(`Drop “${describe(f)}”`, a, { ...r, filters: others });
  }

  return out.sort((x, y) => x.count - y.count || x.label.localeCompare(y.label));
}

