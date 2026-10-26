import type { Metadata } from "next";
import Link from "next/link";
import { u } from "@/components/UnitText";
import { allCars, carHref } from "@/lib/cars";
import { modelHref, modelOf, rangeSpan } from "@/lib/models";
import { formatMiles } from "@/lib/format";
import { DATA_YEAR } from "@/lib/site";

export const metadata: Metadata = {
  title: `Every electric car model A–Z (${DATA_YEAR})`,
  description:
    "Every electric car model sold in the UK, Germany or the Netherlands since 2011, A to Z by make, with the real-world range of each, not WLTP.",
  alternates: { canonical: "/models" },
};

interface Entry {
  name: string;
  href: string;
  range: string;
  versions: number;
  onSale: boolean;
}

/** Every model family, grouped by make: model pages where a model has several versions, otherwise the car page. */
function entriesByMake(): { make: string; entries: Entry[] }[] {
  const byFamily = new Map<string, typeof allCars>();
  for (const c of allCars) byFamily.set(c.family, [...(byFamily.get(c.family) ?? []), c]);
  const byMake = new Map<string, Entry[]>();
  for (const [family, list] of byFamily) {
    const m = modelOf(family);
    const make = list[0].make;
    const entry: Entry = m
      ? { name: family, href: modelHref(m), range: rangeSpan(m), versions: list.length, onSale: m.onSale.length > 0 }
      : { name: family, href: carHref(list[0]), range: formatMiles(list[0].rangeKm), versions: 1, onSale: list[0].status === "Available" };
    byMake.set(make, [...(byMake.get(make) ?? []), entry]);
  }
  return [...byMake.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([make, entries]) => ({ make, entries: entries.sort((a, b) => a.name.localeCompare(b.name)) }));
}

const short = (name: string, make: string) => (name.startsWith(make + " ") ? name.slice(make.length + 1) : name);
const anchor = (make: string) => make.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export default function ModelsPage() {
  const groups = entriesByMake();
  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-wide text-3xl font-semibold leading-tight sm:text-4xl">Every electric car model, A–Z</h1>
      <p className="mt-2 max-w-[62ch] text-muted">
        {total} models from {groups.length} makes, new and used, with their real-world range (not WLTP). Each model page lists every version side by side.
      </p>

      <nav aria-label="Makes" className="mt-6 flex flex-wrap gap-1.5 text-sm">
        {groups.map((g) => (
          <a key={g.make} href={`#${anchor(g.make)}`} className="rounded-full bg-card px-3 py-1.5 shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--foreground)]">
            {g.make}
          </a>
        ))}
      </nav>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g.make} id={anchor(g.make)} aria-labelledby={`make-${anchor(g.make)}`} className="scroll-mt-6">
            <h2 id={`make-${anchor(g.make)}`} className="font-wide text-lg font-semibold">{g.make}</h2>
            <ul className="mt-2 grid gap-1">
              {g.entries.map((e) => (
                <li key={e.name}>
                  <Link href={e.href} className="flex items-baseline justify-between gap-3 border-t border-line py-1.5 text-[15px] hover:text-foreground">
                    <span className="min-w-0 underline decoration-line underline-offset-4 hover:decoration-foreground">
                      {short(e.name, g.make)}
                      {!e.onSale && <span className="ml-1.5 text-xs text-muted">used</span>}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {u(e.range)}
                      {e.versions > 1 && ` · ${e.versions} versions`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
