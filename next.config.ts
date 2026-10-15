import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Used-car prices are estimated for the year the site was built, so server and browser always agree and the
  // estimates move on each time the site is redeployed (see lib/market.ts).
  env: { NEXT_PUBLIC_VALUATION_YEAR: String(new Date().getFullYear()) },
};

export default nextConfig;
