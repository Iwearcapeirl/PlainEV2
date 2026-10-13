/** Edition details shown on the ranking pages. Update these when cars.json is refreshed. */
export const SITE_NAME = "PlainEV";
export const DATA_YEAR = 2026;
export const UPDATED_LABEL = "October 2026";
export const UPDATED_ISO = "2026-10-09";

/**
 * Public site URL, used for canonical links, the sitemap and robots.txt.
 * Set NEXT_PUBLIC_SITE_URL (e.g. https://plainev.co.uk) in production.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
