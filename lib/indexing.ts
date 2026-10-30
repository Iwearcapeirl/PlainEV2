import { allCars, type Car } from "./cars";

/**
 * Which car pages search engines should index. Every car keeps its page, but only one page per version is indexed:
 * the one on sale in the UK if there is one, otherwise the newest model year. Older model years of the same version
 * (same model family and name, e.g. "Taycan Turbo S 2023-2024" next to "Taycan Turbo S") and cars sold only in
 * Germany or the Netherlands get "noindex, follow" and stay out of the sitemap: they add little for UK searchers and
 * made the site look thin to Google (AdSense review, October 2026). Model pages list every version.
 */

/** On sale in the UK first, then coming soon, then no longer sold; a version on sale only in Germany or the
 * Netherlands comes last, so its older UK-sold model years keep an indexed page. */
const rank = (c: Car) => (c.status === "Available" && c.priceGbp !== null ? 0 : c.status === "Upcoming" ? 1 : c.status === "Discontinued" ? 2 : 3);

/** For each car, the page that represents its version: itself, or the newer/UK version of the same car. */
const LEAD: Map<number, Car> = (() => {
  const byVersion = new Map<string, Car[]>();
  for (const c of allCars) {
    const k = `${c.family}|${c.variant}`;
    byVersion.set(k, [...(byVersion.get(k) ?? []), c]);
  }
  const lead = new Map<number, Car>();
  for (const list of byVersion.values()) {
    const [first] = [...list].sort((a, b) => rank(a) - rank(b) || (b.yearTo ?? 9999) - (a.yearTo ?? 9999) || b.yearFrom - a.yearFrom || a.id - b.id);
    for (const c of list) lead.set(c.id, first);
  }
  return lead;
})();

/** The indexed page for this car's version (itself when it is indexed). */
export const leadVersion = (c: Car): Car => LEAD.get(c.id) ?? c;

/** True when search engines should index this car's page. */
export function isIndexable(c: Car): boolean {
  if (c.status === "Available" && c.priceGbp === null) return false;
  return leadVersion(c).id === c.id;
}
