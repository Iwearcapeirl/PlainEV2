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
  "porsche-taycan-4-cross-turismo-2023-2024": "porsche-taycan-4-cross-turismo-my23-24",
  "ford-explorer-extended-range-rwd-my24": "ford-explorer-extended-range-rwd-limited-edition-my24",
  // October 31 2026 data update: Taycans gained model-year tags in EV Database, and new versions took over names.
  "porsche-taycan-turbo-s-2020-2023": "porsche-taycan-turbo-s-my20-22",
  "kia-e-soul-64-kwh-2020-2021": "kia-e-soul-64-kwh-2019-2021",
  "porsche-taycan-4-cross-turismo-2021-2023": "porsche-taycan-4-cross-turismo-my21-22",
  "porsche-taycan-turbo-2020-2023": "porsche-taycan-turbo-my20-22",
  "porsche-taycan-4s-2020-2023": "porsche-taycan-4s-my20-22",
  "porsche-taycan-4s-plus-2020-2023": "porsche-taycan-4s-plus-my20-22",
  "kia-e-niro-64-kwh-2020-2021": "kia-e-niro-64-kwh-2020-2020",
  "porsche-taycan-2021-2023": "porsche-taycan-my21-22",
  "porsche-taycan-plus-2021-2023": "porsche-taycan-plus-my21-22",
  "porsche-taycan-4s-cross-turismo-2021-2023": "porsche-taycan-4s-cross-turismo-my21-22",
  "porsche-taycan-turbo-cross-turismo-2021-2023": "porsche-taycan-turbo-cross-turismo-my21-22",
  "porsche-taycan-turbo-s-cross-turismo-2021-2023": "porsche-taycan-turbo-s-cross-turismo-my21-22",
  "porsche-taycan-gts-2022-2024": "porsche-taycan-gts-my22-24",
  "porsche-taycan-gts-sport-turismo-2022-2024": "porsche-taycan-gts-sport-turismo-my22-24",
  "porsche-taycan-sport-turismo-2022-2024": "porsche-taycan-sport-turismo-my22-24",
  "porsche-taycan-plus-sport-turismo-2022-2024": "porsche-taycan-plus-sport-turismo-my22-24",
  "porsche-taycan-4s-sport-turismo-2022-2024": "porsche-taycan-4s-sport-turismo-my22-24",
  "porsche-taycan-4s-plus-sport-turismo-2022-2024": "porsche-taycan-4s-plus-sport-turismo-my22-24",
  "porsche-taycan-turbo-sport-turismo-2022-2024": "porsche-taycan-turbo-sport-turismo-my22-24",
  "porsche-taycan-turbo-s-sport-turismo-2022-2024": "porsche-taycan-turbo-s-sport-turismo-my22-24",
  "porsche-taycan-2023-2024": "porsche-taycan-my23-24",
  "porsche-taycan-plus-2023-2024": "porsche-taycan-plus-my23-24",
  "porsche-taycan-4s-2023-2024": "porsche-taycan-4s-my23-24",
  "porsche-taycan-4s-plus-2023-2024": "porsche-taycan-4s-plus-my23-24",
  "porsche-taycan-turbo-2023-2024": "porsche-taycan-turbo-my23-24",
  "porsche-taycan-turbo-s-2023-2024": "porsche-taycan-turbo-s-my23-24",
  "porsche-taycan-4-cross-turismo-2022-2024": "porsche-taycan-4-cross-turismo-my23-24",
  "porsche-taycan-4s-cross-turismo-2023-2024": "porsche-taycan-4s-cross-turismo-my23-24",
  "porsche-taycan-turbo-cross-turismo-2023-2024": "porsche-taycan-turbo-cross-turismo-my23-24",
  "porsche-taycan-turbo-s-cross-turismo-2023-2024": "porsche-taycan-turbo-s-cross-turismo-my23-24",
  "porsche-taycan": "porsche-taycan-my25-27",
  "porsche-taycan-plus": "porsche-taycan-plus-my25-27",
  "porsche-taycan-4s": "porsche-taycan-4s-my25-27",
  "porsche-taycan-4s-plus": "porsche-taycan-4s-plus-my25-27",
  "porsche-taycan-turbo": "porsche-taycan-turbo-my25-27",
  "porsche-taycan-turbo-s": "porsche-taycan-turbo-s-my25-27",
  "porsche-taycan-sport-turismo": "porsche-taycan-sport-turismo-my25-27",
  "porsche-taycan-plus-sport-turismo": "porsche-taycan-plus-sport-turismo-my25-27",
  "porsche-taycan-4s-sport-turismo": "porsche-taycan-4s-sport-turismo-my25-27",
  "porsche-taycan-4s-plus-sport-turismo": "porsche-taycan-4s-plus-sport-turismo-my25-27",
  "porsche-taycan-turbo-sport-turismo": "porsche-taycan-turbo-sport-turismo-my25-27",
  "porsche-taycan-turbo-s-sport-turismo": "porsche-taycan-turbo-s-sport-turismo-my25-27",
  "porsche-taycan-4-cross-turismo": "porsche-taycan-4-cross-turismo-my25-27",
  "porsche-taycan-4s-cross-turismo": "porsche-taycan-4s-cross-turismo-my25-27",
  "porsche-taycan-turbo-cross-turismo": "porsche-taycan-turbo-cross-turismo-my25-27",
  "porsche-taycan-turbo-s-cross-turismo": "porsche-taycan-turbo-s-cross-turismo-my25-27",
  "porsche-taycan-turbo-gt": "porsche-taycan-turbo-gt-my25-27",
  "porsche-taycan-turbo-gt-weissach": "porsche-taycan-turbo-gt-weissach-my25-27",
  "fiat-grande-panda": "fiat-grande-panda-44-kwh",
  "porsche-taycan-4": "porsche-taycan-4-my25-27",
  "porsche-taycan-4-plus": "porsche-taycan-4-plus-my25-27",
  "porsche-taycan-gts": "porsche-taycan-gts-my25-27",
  "porsche-taycan-gts-sport-turismo": "porsche-taycan-gts-sport-turismo-my25-27",
  "renault-4-e-tech-40kwh-120hp": "renault-4-e-tech-40kwh-120hp-my25-26",
  "renault-4-e-tech-52kwh-150hp": "renault-4-e-tech-52kwh-150hp-my25-26",
};

export default nextConfig;
