import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Used-car prices are estimated for the year the site was built, so server and browser always agree and the
  // estimates move on each time the site is redeployed (see lib/market.ts).
  env: { NEXT_PUBLIC_VALUATION_YEAR: String(new Date().getFullYear()) },
  // Car pages whose address changed (UK names in scripts/build.py, or years and names changed in a data update): old links keep working.
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
  // October 2026 data update: years or names that changed in EV Database's data.
  "mitsubishi-i-miev-2015-2018": "mitsubishi-i-miev-2014-2018",
  "audi-e-tron-55-quattro-2019-2021": "audi-e-tron-55-quattro-2019-2020",
  "mercedes-benz-evito-tourer-long-90-kwh-2020-2023": "mercedes-benz-evito-tourer-long-90-kwh-2020-2024",
  "mercedes-benz-evito-tourer-extra-long-90-kwh-2020-2023": "mercedes-benz-evito-tourer-extra-long-90-kwh-2020-2024",
  "porsche-taycan-4-cross-turismo-2023-2024": "porsche-taycan-4-cross-turismo-2022-2024",
  "ford-explorer-extended-range-rwd-my24": "ford-explorer-extended-range-rwd-limited-edition-my24",
};

export default nextConfig;
