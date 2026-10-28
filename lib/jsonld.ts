import { SITE_URL } from "./site";

/** schema.org data for search engines (JSON-LD). Paths are site-relative ("/best"); URLs are made absolute here. */

const abs = (path: string) => `${SITE_URL}${path}`;

/** The breadcrumb trail shown on the page, as BreadcrumbList. The last item is the page itself. */
export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
  };
}

/** A ranked list of pages on this site (a "summary page" list: each item is just its position and URL). */
export function itemListLd(name: string, items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: abs(it.path) })),
  };
}
