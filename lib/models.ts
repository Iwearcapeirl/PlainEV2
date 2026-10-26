import { bodyLabel, bodyPlural, homeCountry } from "./carProfile";
import { allCars, cars, slugify, type Car } from "./cars";
import { formatDistance, formatEfficiency, formatMiles } from "./format";
import { capBand, COUNTRIES, formatBand, formatMoney, newPrice, usedEstimates, type Country, type UsedEstimate } from "./market";
import { both } from "./units";

/**
 * Model pages: one per model family with two or more versions (e.g. every Porsche Taycan, across body styles and
 * years), at /model/{slug}. Families with a single version use that version's car page instead.
 */

export interface VersionGroup {
  /** "On sale now", "On sale now: Sport Turismo (estate)", "No longer sold new" … */
  title: string;
  versions: Car[];
}

export interface Model {
  /** "Porsche Taycan" */
  name: string;
  make: string;
  slug: string;
  versions: Car[];
  /** A version with a photo, preferring one on sale new (for the header image and share card). */
  lead: Car;
  /** Country whose prices the page uses: the UK when any version was sold here. */
  country: Country | null;
  onSale: Car[];
}

const statusRank = (c: Car) => (c.status === "Available" ? 0 : c.status === "Upcoming" ? 1 : 2);
/** Newest and on sale first, then longest range. */
const versionOrder = (a: Car, b: Car) =>
  statusRank(a) - statusRank(b) || (b.yearTo ?? 9999) - (a.yearTo ?? 9999) || b.yearFrom - a.yearFrom || b.rangeKm - a.rangeKm || a.id - b.id;

export const models: Model[] = (() => {
  const byFamily = new Map<string, Car[]>();
  for (const c of allCars) byFamily.set(c.family, [...(byFamily.get(c.family) ?? []), c]);
  const out: Model[] = [];
  for (const [name, list] of byFamily) {
    if (list.length < 2) continue;
    const versions = [...list].sort(versionOrder);
    const lead = versions.find((c) => c.image && c.status === "Available") ?? versions.find((c) => c.image) ?? versions[0];
    const country = versions.some((c) => c.priceGbp !== null)
      ? "uk"
      : (["de", "nl"] as const).find((k) => versions.some((c) => newPrice(c, k) !== null)) ?? homeCountry(versions[0]);
    out.push({
      name,
      make: versions[0].make,
      slug: slugify(name),
      versions,
      lead,
      country,
      onSale: versions.filter((c) => c.status === "Available"),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
})();

const BY_SLUG = new Map(models.map((m) => [m.slug, m]));
const BY_FAMILY = new Map(models.map((m) => [m.name, m]));
export const getModel = (slug: string) => BY_SLUG.get(slug);
/** The model page for a family, or undefined when the family has a single version (no model page). */
export const modelOf = (family: string) => BY_FAMILY.get(family);
export const modelHref = (m: Pick<Model, "slug">) => `/model/${m.slug}`;
/** Link for a family name: its model page, if it has one. */
export const familyHref = (family: string) => {
  const m = modelOf(family);
  return m ? modelHref(m) : undefined;
};

/** Versions grouped for the table: on sale (by body style when there's more than one), coming soon, older ones. */
export function versionGroups(m: Model): VersionGroup[] {
  const groups: VersionGroup[] = [];
  const onSale = m.versions.filter((c) => c.status === "Available");
  const bodies = [...new Set(onSale.map((c) => c.body))];
  if (bodies.length > 1) {
    for (const b of bodies) groups.push({ title: `On sale now: ${bodyPlural(b)}`, versions: onSale.filter((c) => c.body === b) });
  } else if (onSale.length) {
    groups.push({ title: "On sale now", versions: onSale });
  }
  const upcoming = m.versions.filter((c) => c.status === "Upcoming");
  if (upcoming.length) groups.push({ title: "Coming soon", versions: upcoming });
  const old = m.versions.filter((c) => c.status === "Discontinued");
  if (old.length) {
    const from = Math.min(...old.map((c) => c.yearFrom));
    const to = Math.max(...old.map((c) => c.yearTo ?? c.yearFrom));
    groups.push({ title: `No longer sold new (${from === to ? from : `${from}–${to}`})`, versions: old });
  }
  return groups;
}

const span = (xs: number[]) => [Math.min(...xs), Math.max(...xs)] as const;

/** "190–330 miles" (or "305–530 km"), for the header. */
export function rangeSpan(m: Model): string {
  const [lo, hi] = span(m.versions.map((c) => c.rangeKm));
  const mi = (km: number) => Math.round(km / 1.609344);
  return lo === hi
    ? both(`${mi(lo)} miles`, `${Math.round(lo)} km`)
    : both(`${mi(lo)}–${mi(hi)} miles`, `${Math.round(lo)}–${Math.round(hi)} km`);
}

/** New prices of the versions on sale in the page's country: [cheapest, dearest], or null. */
export function newPriceSpan(m: Model): readonly [number, number] | null {
  if (!m.country) return null;
  const prices = m.onSale.map((c) => newPrice(c, m.country!)).filter((p): p is number => p !== null);
  return prices.length ? span(prices) : null;
}

/**
 * Likely used prices by model year across the model: the band runs from the cheapest version's bottom to the dearest
 * version's top, each capped under that version's new price. Newest year first.
 */
export function usedByYear(m: Model): UsedEstimate[] {
  if (!m.country) return [];
  const byYear = new Map<number, UsedEstimate[]>();
  for (const c of m.versions) for (const e of usedEstimates(c, m.country)) byYear.set(e.year, [...(byYear.get(e.year) ?? []), e]);
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, es]) => {
      const low = Math.min(...es.map((e) => e.low));
      const high = Math.max(...es.map((e) => e.high));
      const typical = Math.round((low + high) / 200) * 100;
      const rangeTodayKm = Math.max(...es.map((e) => e.rangeTodayKm));
      return { year, low, high, typical, rangeTodayKm };
    });
}

/** The cheapest used band across the model (the cheapest version's oldest year), capped under the cheapest new price. */
export function usedFromBand(m: Model): UsedEstimate | null {
  if (!m.country) return null;
  const all = m.versions.flatMap((c) => usedEstimates(c, m.country!));
  if (!all.length) return null;
  const cheapest = all.reduce((a, b) => (b.high < a.high ? b : a));
  const span = newPriceSpan(m);
  return span ? capBand(cheapest, span[0]) : cheapest;
}

/** A few short paragraphs written from the figures. */
export function modelSummary(m: Model): string[] {
  const out: string[] = [];
  const longest = [...m.versions].sort((a, b) => b.rangeKm - a.rangeKm)[0];
  const efficient = [...m.versions].sort((a, b) => a.whPerKm - b.whPerKm)[0];
  const years = span(m.versions.map((c) => c.yearFrom));
  const lastYear = Math.max(...m.versions.map((c) => c.yearTo ?? new Date().getFullYear()));
  const bodies = [...new Set(m.versions.map((c) => bodyLabel(c.body).toLowerCase()))];

  out.push(
    `The ${m.name} has come in ${m.versions.length} versions since ${years[0]}` +
      (bodies.length > 1 ? `, as ${bodies.slice(0, -1).join(", ")} and ${bodies[bodies.length - 1]} body styles` : "") +
      `. ${m.onSale.length ? `${m.onSale.length} ${m.onSale.length === 1 ? "is" : "are"} on sale new today` : `None is sold new any more (the last were ${lastYear} models)`}. ` +
      `Real-world range spans ${rangeSpan(m)}, depending on battery, motors and wheels.`,
  );

  out.push(
    `The longest-range version is the ${m.make} ${longest.model}, at ${formatDistance(longest.rangeKm)}. ` +
      (efficient.id === longest.id
        ? "It is also the most efficient."
        : `The most efficient is the ${efficient.model}, at ${formatEfficiency(efficient.whPerKm)}.`),
  );

  const prices = newPriceSpan(m);
  if (prices && m.country) {
    const cheapest = m.onSale.find((c) => newPrice(c, m.country!) === prices[0])!;
    const where = m.country === "uk" ? "in the UK" : `in ${COUNTRIES[m.country].label}`;
    const peers = cars.filter((c) => c.segment === cheapest.segment && c.body === cheapest.body && c.family !== m.name);
    const median = peers.length ? [...peers].map((c) => c.rangeKm).sort((a, b) => a - b)[Math.floor(peers.length / 2)] : null;
    out.push(
      `New, prices ${where} start at ${formatMoney(prices[0], m.country)} for the ${cheapest.model}` +
        (prices[1] > prices[0] ? ` and go up to ${formatMoney(prices[1], m.country)}` : "") +
        "." +
        (m.country === "uk" && median !== null
          ? ` That cheapest version goes ${cheapest.rangeKm >= median ? "further than" : "less far than"} the typical rival of its size and body style, at about ${formatMiles(median)}.`
          : ""),
    );
  }

  const used = usedFromBand(m);
  if (used && m.country) {
    out.push(
      `Used, a ${used.year} example is likely to be advertised at roughly ${formatBand(used.low, used.high, m.country)}, our estimate for an average-mileage car. ` +
        `Check real listings before you budget: trim, mileage and condition make a big difference.`,
    );
  }
  return out;
}

/** The UK warranty and other per-make facts are shared by every version; the lead version stands in for the model. */
export const modelPriceLabel = (m: Model) => {
  const p = newPriceSpan(m);
  if (!p || !m.country) return null;
  return p[0] === p[1] ? formatMoney(p[0], m.country) : `${formatMoney(p[0], m.country)}–${formatMoney(p[1], m.country)}`;
};

/** For the Models A–Z page: makes in order, each with its models. */
export function modelsByMake(): { make: string; models: Model[] }[] {
  const byMake = new Map<string, Model[]>();
  for (const m of models) byMake.set(m.make, [...(byMake.get(m.make) ?? []), m]);
  return [...byMake.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([make, list]) => ({ make, models: list }));
}
