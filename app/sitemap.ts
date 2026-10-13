import type { MetadataRoute } from "next";
import { carHref, cars } from "@/lib/cars";
import { rankingPages } from "@/lib/rankings";
import { SITE_URL, UPDATED_ISO } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(UPDATED_ISO);
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/quiz`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/best`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    ...rankingPages.map((p) => ({
      url: `${SITE_URL}/best/${p.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...cars.map((c) => ({
      url: `${SITE_URL}${carHref(c)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
