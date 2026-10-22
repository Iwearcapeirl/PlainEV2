import autotrader from "@/data/autotrader.json";
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
 * Share of the new price a typical second-hand example keeps at a given age (average mileage, dealer or private
 * asking price). Fitted in October 2026 to median AutoTrader asking prices for 51 model years, from nearly new to
 * nine years old (data/README.md). Dearer cars lose a bigger share (the price effect stops at £80k), and a few makes
 * sit clearly above or below the curve. Ages count from the model year, so a "1-year-old" car is 1–2 years old.
 */
export function retained(age: number, newPrice: number, make: string, family = ""): number {
  const a = Math.max(1, age);
  // Above about £60k the price makes little further difference to the share kept.
  const p = Math.min(newPrice, 60_000);
  const factor = FAMILY_FACTOR[family] ?? MAKE_FACTOR[make] ?? 1;
  return Math.min(Math.exp(0.364 - 0.549 * Math.log(a + 0.5) - 0.106 * (p / 10_000)) * factor, MAX_RETAINED);
}

/** Makes whose asking prices sat clearly above or below the curve in the October 2026 check (51 model years). */
const MAKE_FACTOR: Record<string, number> = { Tesla: 1.2, Kia: 1.14, BMW: 1.09, "Mercedes-Benz": 1.09, MG: 0.72 };
/**
 * Models that differ from their make: the old Leaf sells for far less than newer Nissans such as the Ariya, and the
 * first big electric SUVs from Jaguar and Audi lost value faster than later premium EVs.
 */
const FAMILY_FACTOR: Record<string, number> = { "Nissan Leaf": 0.71, "Jaguar I-Pace": 0.84, "Audi e-tron": 0.84 };
/** No used car is estimated at more than this share of its new price. */
const MAX_RETAINED = 0.9;

/**
 * The band shown around the typical price. In the check, the cheaper normal listings (10th percentile) sat about 15%
 * under the median and the dearer ones (75th percentile) 5–10% over; the curve itself is off by about 9% either way,
 * and nine in ten model years were within 15%, so the band is ±15%. Budget checks use the top of the band.
 */
const SPREAD = 0.15;

export interface UsedEstimate {
  /** Model year */
  year: number;
  /** Typical asking price, rounded to the nearest 100 */
  typical: number;
  /** Likely price band, rounded to the nearest 100. Budget checks use `high`, so a car only counts as affordable if a typical example is. */
  low: number;
  high: number;
  /** Estimated real-world range today after battery wear, in km */
  rangeTodayKm: number;
}

const round100 = (n: number) => Math.round(n / 100) * 100;

export function usedEstimate(c: Car, country: Country, year: number): UsedEstimate | null {
  const price = newPrice(c, country);
  if (price === null) return null;
  // The curve was fitted on UK pounds; euro prices are scaled to pounds for the price effect.
  const gbpEquivalent = country === "uk" ? price : price * 0.86;
  const typical = price * retained(VALUATION_YEAR - year, gbpEquivalent, c.make, c.family);
  return capBand(
    {
      year,
      typical: round100(typical),
      low: round100(typical * (1 - SPREAD)),
      high: round100(typical * (1 + SPREAD)),
      rangeTodayKm: Math.round(c.rangeKm * (1 - BATTERY_LOSS_PER_YEAR) ** Math.max(0, VALUATION_YEAR - year)),
    },
    price,
  );
}

/** A used car should always look cheaper than a new one: the band tops out a little under the new price. */
const USED_CEILING = 0.95;
export function capBand(e: UsedEstimate, newPriceCap: number): UsedEstimate {
  const high = Math.min(e.high, round100(newPriceCap * USED_CEILING));
  if (high >= e.high) return e;
  // Keep the bottom of the band where it was unless the lower top squeezes it.
  const low = Math.min(e.low, round100(high * 0.85));
  return { ...e, high, low, typical: Math.min(e.typical, round100((low + high) / 2)) };
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
  const prices = [o.newPrice, o.used?.high].filter((p): p is number => p != null);
  return prices.length ? Math.min(...prices) : null;
}

const money = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
/** "£24,500" or "€24,500" */
export const formatMoney = (n: number, country: Country) => `${COUNTRIES[country].symbol}${money.format(n)}`;
/** "£24.1k–£32.6k" (or "£8,200–£11,100" under £10k): compact price band for cards and lists. */
export function formatBand(low: number, high: number, country: Country): string {
  const sym = COUNTRIES[country].symbol;
  const k = (n: number) => (high >= 10_000 ? `${sym}${(Math.round(n / 100) / 10).toFixed(1)}k` : `${sym}${money.format(n)}`);
  return `${k(low)}–${k(high)}`;
}
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
  const newMin = news.length ? Math.min(...news) : null;
  const used = useds.length ? useds.reduce((a, b) => (b.high < a.high ? b : a)) : null;
  return {
    newPrice: newMin,
    // Shown next to the group's cheapest new price, so keep the used band under that too.
    used: used && newMin !== null ? capBand(used, newMin) : used,
  };
}

/**
 * When a result is only in the buyer's budget second-hand (its new price is over the limit): which model years fit
 * and the lowest typical price among them. Null when the new price fits, or there's no budget.
 */
export interface BudgetFit {
  yearFrom: number;
  yearTo: number;
  /** Price band of the cheapest model year that fits */
  low: number;
  high: number;
}
export function usedBudgetFit(g: ResultGroup, country: Country, condition: Condition, max: number | null): BudgetFit | null {
  if (max === null || condition === "new") return null;
  const o = groupOffer(g, country, condition);
  if (o.newPrice === null || o.newPrice <= max) return null;
  const fits = g.versions.flatMap((c) => usedEstimates(c, country)).filter((e) => e.high <= max);
  if (!fits.length) return null;
  const years = fits.map((e) => e.year);
  const cheapest = fits.reduce((x, y) => (y.high < x.high ? y : x));
  return { yearFrom: Math.min(...years), yearTo: Math.max(...years), low: cheapest.low, high: cheapest.high };
}

/** "In your budget used: 2022–2023 cars, roughly £21.5k–£29.1k" */
export const budgetFitText = (f: BudgetFit, country: Country) =>
  `In your budget used: ${f.yearFrom === f.yearTo ? f.yearFrom : `${f.yearFrom}–${f.yearTo}`} cars, roughly ${formatBand(f.low, f.high, country)}`;

// ---------- "Search for this car" ----------


const urlSlug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * AutoTrader's names for our makes and models (data/autotrader.json, made by checking each search on AutoTrader:
 * a model name is only listed if AutoTrader's search for it, filtered to electric cars, returned cars).
 * Models not listed fall back to every electric car of that make.
 */
const AT = autotrader as { makes: Record<string, string>; models: Record<string, string> };

export interface ListingSearch {
  site: "AutoTrader" | "AutoScout24";
  url: string;
  label: string;
  /** True when the search is for this model; false when it's every electric car of the make. */
  exact: boolean;
}

/**
 * A search for this car on a listings site (new and used): AutoTrader in the UK, AutoScout24 in Germany and the
 * Netherlands. Visitors enter their own postcode on AutoTrader.
 */
export function listingSearch(c: Car, country: Country, years?: { from: number; to: number }): ListingSearch {
  if (country === "uk") {
    const make = AT.makes[c.family] ?? AT.makes[c.make] ?? c.make;
    const model = AT.models[c.family];
    const q = new URLSearchParams({
      make,
      ...(model ? { model } : {}),
      "fuel-type": "Electric",
      ...(years ? { "year-from": String(years.from), "year-to": String(years.to) } : {}),
    });
    return {
      site: "AutoTrader",
      url: `https://www.autotrader.co.uk/car-search?${q}`,
      label: model ? "Search for this car on AutoTrader" : `Search for ${make} electric cars on AutoTrader`,
      exact: Boolean(model),
    };
  }
  const model = c.family.startsWith(c.make + " ") ? c.family.slice(c.make.length + 1) : c.variant.split(" ")[0];
  const domain = country === "de" ? "autoscout24.de" : "autoscout24.nl";
  return {
    site: "AutoScout24",
    url: `https://www.${domain}/lst/${urlSlug(c.make)}/${urlSlug(model)}?fuel=E${years ? `&fregfrom=${years.from}&fregto=${years.to}` : ""}`,
    label: "Search for this car on AutoScout24",
    exact: true,
  };
}
