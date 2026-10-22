/**
 * Miles or kilometres. Pages are built ahead of time, so any text with a distance or efficiency carries both versions,
 * marked with private-use characters: miles versionkm version. components/UnitText.tsx turns that
 * into two spans, and CSS shows the one picked with the switch in the top bar (html[data-units], see app/layout.tsx).
 * Text that ends up somewhere CSS can't reach (page titles, descriptions, share images, attributes) uses `plain()`,
 * which keeps the miles version.
 */

export type Units = "mi" | "km";
export const UNITS_KEY = "plainev:units";

const OPEN = "";
const SEP = "";
const CLOSE = "";
export const UNITS_RE = /([^]*)([^]*)/g;

/** Text with a miles version and a km version; shown according to the switch. */
export const both = (mi: string, km: string) => (mi === km ? mi : `${OPEN}${mi}${SEP}${km}${CLOSE}`);

/** One version only (miles by default), for titles, descriptions, attributes and images. */
export const plain = (s: string, units: Units = "mi") => s.replace(UNITS_RE, (_, mi: string, km: string) => (units === "mi" ? mi : km));

export const hasUnits = (s: string) => s.includes(OPEN);
/** Any marker character at all (for tests: none should reach a page outside the two spans). */
export const UNIT_MARKER_RE = /[]/;

/** Every string in page metadata (title, description, Open Graph) in miles: search results and share previews can't switch. */
export function plainDeep<T>(value: T): T {
  if (typeof value === "string") return plain(value) as T;
  if (Array.isArray(value)) return value.map(plainDeep) as T;
  if (value && typeof value === "object" && !(value instanceof URL)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plainDeep(v)])) as T;
  }
  return value;
}
