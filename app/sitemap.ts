import type { MetadataRoute } from "next";
import { allCars as cars, carHref } from "@/lib/cars";
import { isIndexable } from "@/lib/indexing";
import { modelHref, models } from "@/lib/models";
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
    { url: `${SITE_URL}/models`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/running-costs`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/methodology`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: "yearly" as const, priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: "yearly" as const, priority: 0.2 },
    ...models.map((m) => ({
      url: `${SITE_URL}${modelHref(m)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
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
    ...cars.filter(isIndexable).map((c) => ({
      url: `${SITE_URL}${carHref(c)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
