import type { Car } from "./cars";
import { KM_PER_MILE } from "./format";

/**
 * New and used buying, by country. Every car has a new price in at least one of the UK, Germany and the
 * Netherlands (the price it's on sale at now, or its last price when it was sold new). Used prices are estimated
 * from that price and the car's age; nothing here is a real valuation.
 */

export type Country = "uk" | "de" | "nl";
export type Condition = "both" | "new" | "used";

export const COUNTRIES: Record<Country, { label: string; symbol: "£" | "€"; currency: "GBP" | "EUR" }> = {
  uk: { label: "UK", symbol: "£", currency: "GBP" },
  de: { label: "Germany", symbol: "€", currency: "EUR" },
  nl: { label: "Netherlands", symbol: "€", currency: "EUR" },
};
export const COUNTRY_IDS = Object.keys(COUNTRIES) as Country[];

export const CONDITIONS: { id: Condition; label: string; hint: string }[] = [
  { id: "both", label: "New or used", hint: "Show every car that fits, whether you buy it new or second-hand" },
  { id: "new", label: "New only", hint: "Cars you can order new today" },
  { id: "used", label: "Used only", hint: "Second-hand cars, with estimated prices" },
];

/**
 * The year used prices are worked out for. Set at build time (next.config.ts), so estimates move on each time the
 * site is redeployed and the server and browser always agree.
 */
export const VALUATION_YEAR = Number(process.env.NEXT_PUBLIC_VALUATION_YEAR) || new Date().getFullYear();

/** Assumed battery capacity loss per year, for "about X miles today". */
export const BATTERY_LOSS_PER_YEAR = 0.02;

/** New price in a country's currency, or null when the car wasn't sold there. */
export function newPrice(c: Car, country: Country): number | null {
  return country === "uk" ? c.priceGbp : country === "de" ? c.priceDeEur : c.priceNlEur;
}

/** On sale new today in this country. */
export const soldNew = (c: Car, country: Country) => c.status === "Available" && newPrice(c, country) !== null;

/**
 * Model years a second-hand example could be from: from launch to the last year it was sold new (discontinued),
 * or to last year (still on sale, so this year's cars are new). Upcoming cars have none.
 */
export function usedYears(c: Car): number[] {
  if (c.status === "Upcoming") return [];
  const last = c.status === "Available" ? VALUATION_YEAR - 1 : Math.min(c.yearTo ?? VALUATION_YEAR, VALUATION_YEAR);
  const years: number[] = [];
  for (let y = c.yearFrom; y <= last; y++) years.push(y);
  return years;
}

/**
 * Share of the new price a car keeps at a given age, as [low, high]:
 * 57–65% after a year, 38–42% after three (falling evenly in between), then 10–15% less each further year.
 * Cars under a year old are treated as a year old: once it's second-hand, the first-year drop has happened.
 */
export function retained(age: number): [number, number] {
  const a = Math.max(1, age);
  if (a === 1) return [0.57, 0.65];
  if (a === 2) return [(0.57 + 0.38) / 2, (0.65 + 0.42) / 2];
  if (a === 3) return [0.38, 0.42];
  return [0.38 * 0.85 ** (a - 3), 0.42 * 0.9 ** (a - 3)];
}

export interface UsedEstimate {
  /** Model year */
  year: number;
  /** Estimated price range, rounded to the nearest 100 */
  low: number;
  high: number;
  /** Estimated real-world range today after battery wear, in km */
  rangeTodayKm: number;
}

const round100 = (n: number) => Math.round(n / 100) * 100;

export function usedEstimate(c: Car, country: Country, year: number): UsedEstimate | null {
  const price = newPrice(c, country);
  if (price === null) return null;
  const [lo, hi] = retained(VALUATION_YEAR - year);
  return {
    year,
    low: round100(price * lo),
    high: round100(price * hi),
    rangeTodayKm: Math.round(c.rangeKm * (1 - BATTERY_LOSS_PER_YEAR) ** Math.max(0, VALUATION_YEAR - year)),
  };
}

/** Estimates for every model year a used example could be, newest first. */
export const usedEstimates = (c: Car, country: Country) =>
  usedYears(c)
    .reverse()
    .map((y) => usedEstimate(c, country, y))
    .filter((e): e is UsedEstimate => e !== null);

/** The cheapest used example: the oldest model year. */
export function usedFrom(c: Car, country: Country): UsedEstimate | null {
  const years = usedYears(c);
  return years.length ? usedEstimate(c, country, years[0]) : null;
}

/** What a buyer could pay for this car, given the country and whether they want new, used or both. */
export interface Offer {
  /** New price, when it's on sale new and new cars are wanted */
  newPrice: number | null;
  /** Cheapest used example, when used cars are wanted */
  used: UsedEstimate | null;
}

export function offer(c: Car, country: Country, condition: Condition): Offer {
  return {
    newPrice: condition !== "used" && soldNew(c, country) ? newPrice(c, country) : null,
    used: condition !== "new" ? usedFrom(c, country) : null,
  };
}

/** A car is in the market when the buyer could get it the way they want, in their country. */
export function inMarket(c: Car, country: Country, condition: Condition): boolean {
  const o = offer(c, country, condition);
  return o.newPrice !== null || o.used !== null;
}

/** The lowest price the buyer could pay (new price or cheapest used estimate), for budget checks. */
export function lowestPrice(o: Offer): number | null {
  const prices = [o.newPrice, o.used?.low].filter((p): p is number => p != null);
  return prices.length ? Math.min(...prices) : null;
}

const money = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
/** "£24,500" or "€24,500" */
export const formatMoney = (n: number, country: Country) => `${COUNTRIES[country].symbol}${money.format(n)}`;
/** "£9,800–£11,200" */
export const formatMoneyRange = (low: number, high: number, country: Country) =>
  `${formatMoney(low, country)}–${formatMoney(high, country)}`;
/** Whole miles from km */
export const miles = (km: number) => Math.round(km / KM_PER_MILE);

// ---------- Grouping results ----------

/** One result: a version of a model, merged across the model years it was sold in. */
export interface ResultGroup {
  key: string;
  /** The best-matching version (first in the ranked list); its page is where the card links. */
  car: Car;
  /** Every matching version in the group, in ranked order */
  versions: Car[];
  /** First model year, and last (null while still on sale new) */
  yearFrom: number;
  yearTo: number | null;
}

/** Same make and version name = one result, e.g. every "Tesla Model 3 Long Range AWD" from 2019 to 2023. */
export function groupResults(ranked: Car[]): ResultGroup[] {
  const groups = new Map<string, ResultGroup>();
  for (const c of ranked) {
    const key = `${c.make}|${c.variant}`;
    const g = groups.get(key);
    if (!g) {
      groups.set(key, { key, car: c, versions: [c], yearFrom: c.yearFrom, yearTo: c.status === "Available" ? null : c.yearTo });
    } else {
      g.versions.push(c);
      g.yearFrom = Math.min(g.yearFrom, c.yearFrom);
      g.yearTo = g.yearTo === null || c.status === "Available" ? null : Math.max(g.yearTo, c.yearTo ?? g.yearTo);
    }
  }
  return [...groups.values()];
}

/** The first `n` groups with no two from the same model family (so the top 5 isn't five Model 3s). */
export function onePerModel(groups: ResultGroup[], n: number): ResultGroup[] {
  const seen = new Set<string>();
  const out: ResultGroup[] = [];
  for (const g of groups) {
    if (seen.has(g.car.family)) continue;
    seen.add(g.car.family);
    out.push(g);
    if (out.length === n) break;
  }
  return out;
}

/** "(2019–2023)", "(2021 on)" or "(2024)" */
export function yearsLabel(g: Pick<ResultGroup, "yearFrom" | "yearTo">): string {
  if (g.yearTo === null) return `${g.yearFrom} on`;
  return g.yearTo === g.yearFrom ? `${g.yearFrom}` : `${g.yearFrom}–${g.yearTo}`;
}

/** The best offer across a group's versions: lowest new price, and the cheapest used example. */
export function groupOffer(g: ResultGroup, country: Country, condition: Condition): Offer {
  const offers = g.versions.map((c) => offer(c, country, condition));
  const news = offers.map((o) => o.newPrice).filter((p): p is number => p !== null);
  const useds = offers.map((o) => o.used).filter((u): u is UsedEstimate => u !== null);
  return {
    newPrice: news.length ? Math.min(...news) : null,
    used: useds.length ? useds.reduce((a, b) => (b.low < a.low ? b : a)) : null,
  };
}

// ---------- "Find this car for sale" ----------

const urlSlug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * A search on a listings site for second-hand examples. AutoScout24 (Germany, the Netherlands) is searched by make
 * and model; it redirects names it doesn't know to the nearest model (e-Niro → Niro). AutoTrader (UK) is searched by
 * make only, for electric cars, because its model names couldn't be checked against ours.
 */
export function listingSearch(c: Car, country: Country): { site: string; url: string; label: string } {
  if (country === "uk") {
    return {
      site: "AutoTrader",
      url: `https://www.autotrader.co.uk/car-search?make=${encodeURIComponent(c.make)}&fuel-type=Electric`,
      label: `Used electric ${c.make}s on AutoTrader`,
    };
  }
  const model = c.family.startsWith(c.make + " ") ? c.family.slice(c.make.length + 1) : c.variant.split(" ")[0];
  const domain = country === "de" ? "autoscout24.de" : "autoscout24.nl";
  return {
    site: "AutoScout24",
    url: `https://www.${domain}/lst/${urlSlug(c.make)}/${urlSlug(model)}?fuel=E`,
    label: `Used ${c.make} ${model} on AutoScout24`,
  };
}
