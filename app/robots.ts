import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /results pages depend on quiz answers in the URL, so keep them out of search indexes.
    rules: [{ userAgent: "*", allow: "/", disallow: "/results" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
