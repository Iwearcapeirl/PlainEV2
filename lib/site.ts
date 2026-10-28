/** Edition details shown on the ranking pages. Update these when cars.json is refreshed. */
export const SITE_NAME = "PlainEV";
export const DATA_YEAR = 2026;
export const UPDATED_LABEL = "October 2026";
export const UPDATED_ISO = "2026-10-18";

/**
 * Public site URL, used for canonical links, the sitemap and robots.txt.
 * Defaults to https://plainev.com in production; NEXT_PUBLIC_SITE_URL overrides it.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.NODE_ENV === "production" ? "https://plainev.com" : "http://localhost:3000")
).replace(/\/+$/, "");

/** Who runs the site and how to reach them (About, Privacy and Terms pages). */
export const OWNER_NAME = "Thomas Downing";
export const CONTACT_EMAIL = "hello@plainev.com";
/** When the Privacy and Terms pages were last changed (ISO date). */
export const POLICIES_UPDATED = "2026-10-28";

/** Google AdSense publisher ID (public). Used by the AdSense script in app/layout.tsx; must match public/ads.txt. */
export const ADSENSE_CLIENT = "ca-pub-5208891643538099";
