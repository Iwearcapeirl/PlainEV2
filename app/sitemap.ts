import type { MetadataRoute } from "next";
import { allCars as cars, carHref } from "@/lib/cars";
import { rankingPages } from "@/lib/rankings";
import { vsPages } from "@/lib/rivals";
import { usedRankingPages } from "@/lib/usedRankings";
import { SITE_URL, UPDATED_ISO } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(UPDATED_ISO);
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/quiz`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/best`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/cars`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    ...[...rankingPages, ...usedRankingPages].map((p) => ({
      url: `${SITE_URL}/best/${p.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...vsPages.map((p) => ({
      url: `${SITE_URL}/vs/${p.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...cars.map((c) => ({
      url: `${SITE_URL}${carHref(c)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
