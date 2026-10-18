import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Used-car prices are estimated for the year the site was built, so server and browser always agree and the
  // estimates move on each time the site is redeployed (see lib/market.ts).
  env: { NEXT_PUBLIC_VALUATION_YEAR: String(new Date().getFullYear()) },
  // Car pages renamed to their UK names (scripts/build.py, UK_NAMES): old links keep working.
  async redirects() {
    return Object.entries(RENAMED).map(([from, to]) => ({ source: `/car/${from}`, destination: `/car/${to}`, permanent: true }));
  },
};

/** Old car-page slug → new one. */
const RENAMED: Record<string, string> = {
  "geely-e5-pro": "geely-ex5-se",
  "geely-e5-max-plus": "geely-ex5-ultra",
  "geely-e5-pro-plus": "geely-ex5-pro-plus",
  "geely-e2-35-kwh": "geely-ex2-35-kwh",
  "geely-e2-47-kwh": "geely-ex2-47-kwh",
};

export default nextConfig;
