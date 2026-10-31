"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { u } from "@/components/UnitText";
import { both } from "@/lib/units";

/** One car in the real-world vs WLTP table (plain data, so the page doesn't ship the whole car list). */
export interface WltpRow {
  slug: string;
  make: string;
  model: string;
  body: string;
  bodyLabel: string;
  rangeKm: number;
  wltpKm: number;
  /** Real-world range as a share of WLTP, 0–1. */
  share: number;
  priceGbp: number;
  /** The car's own page on EV Database, where both figures come from. */
  evdbUrl: string;
}

type SortKey = "share" | "range" | "wltp" | "price" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "share", label: "Share of official range" },
  { key: "range", label: "Real-world range" },
  { key: "wltp", label: "Official (WLTP) range" },
  { key: "price", label: "Price" },
  { key: "name", label: "Name" },
];

const KM_PER_MILE = 1.609344;
const dist = (km: number) => both(`${Math.round(km / KM_PER_MILE)} mi`, `${Math.round(km)} km`);
const gbp = (n: number) => `£${n.toLocaleString("en-GB")}`;

/**
 * Every EV on sale with both figures: sortable and filterable by body style. Rows link to each car's page. The bar
 * shows the share of the official range, on a scale from 50% to 100%.
 */
export default function WltpTable({ rows, typical }: { rows: WltpRow[]; typical: number }) {
  const [sort, setSort] = useState<SortKey>("share");
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  const [body, setBody] = useState("all");
  // The first rows only, until asked: the full list runs to hundreds of cars (all of them are in the CSV download).
  const [all, setAll] = useState(false);
  const FIRST = 50;

  const bodies = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.body, r.bodyLabel);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const shown = useMemo(() => {
    const value = (r: WltpRow): number | string =>
      sort === "share" ? r.share : sort === "range" ? r.rangeKm : sort === "wltp" ? r.wltpKm : sort === "price" ? r.priceGbp : `${r.make} ${r.model}`;
    const list = rows.filter((r) => body === "all" || r.body === body);
    return [...list].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      const c = typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number);
      return (dir === "asc" ? c : -c) || a.slug.localeCompare(b.slug);
    });
  }, [rows, sort, dir, body]);

  const bar = (share: number) => `${Math.max(0, Math.min(100, ((share - 0.5) / 0.5) * 100)).toFixed(1)}%`;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-medium">
          Sort by
          <select
            value={`${sort}:${dir}`}
            onChange={(e) => {
              const [k, d] = e.target.value.split(":") as [SortKey, "asc" | "desc"];
              setSort(k);
              setDir(d);
            }}
            className="rounded-lg bg-card px-3 py-2 text-[16px] font-normal shadow-[inset_0_0_0_1px_var(--line)] sm:text-[15px]"
          >
            {SORTS.map((s) => (
              <optgroup key={s.key} label={s.label}>
                <option value={`${s.key}:desc`}>{s.label}: {s.key === "name" ? "Z to A" : "high to low"}</option>
                <option value={`${s.key}:asc`}>{s.label}: {s.key === "name" ? "A to Z" : "low to high"}</option>
              </optgroup>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Body style
          <select
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="rounded-lg bg-card px-3 py-2 text-[16px] font-normal shadow-[inset_0_0_0_1px_var(--line)] sm:text-[15px]"
          >
            <option value="all">All body styles</option>
            {bodies.map(([b, l]) => (
              <option key={b} value={b}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-muted" aria-live="polite">
          {shown.length} {shown.length === 1 ? "car" : "cars"}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--line)]">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">Electric cars on sale in the UK: real-world range, official WLTP range and the share of it achieved</caption>
          <thead className="bg-accent-soft text-left text-xs text-muted">
            <tr>
              <th scope="col" className="px-3 py-2.5 font-medium sm:px-4">Car</th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Real-world</th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">WLTP</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium sm:w-[34%] sm:px-4">Share of WLTP</th>
            </tr>
          </thead>
          <tbody>
            {(all ? shown : shown.slice(0, FIRST)).map((r) => (
              <tr key={r.slug} className="border-t border-line align-top">
                <th scope="row" className="px-3 py-2.5 text-left font-normal sm:px-4">
                  <Link href={`/car/${r.slug}`} className="font-semibold leading-snug hover:underline">
                    <span className="font-normal text-muted">{r.make} </span>
                    {r.model}
                  </Link>
                  <span className="block text-xs text-muted">
                    {r.bodyLabel} · {gbp(r.priceGbp)} ·{" "}
                    <a href={r.evdbUrl} target="_blank" rel="noopener" className="underline decoration-line underline-offset-2 hover:text-foreground">
                      EV Database
                      <span className="sr-only"> page for the {r.make} {r.model} (opens in a new tab)</span>
                    </a>
                    {/* On phones the two ranges sit under the name. */}
                    <span className="sm:hidden">
                      {" "}
                      · {u(dist(r.rangeKm))} real, {u(dist(r.wltpKm))} WLTP
                    </span>
                  </span>
                </th>
                <td className="hidden px-3 py-2.5 text-right sm:table-cell">{u(dist(r.rangeKm))}</td>
                <td className="hidden px-3 py-2.5 text-right text-muted sm:table-cell">{u(dist(r.wltpKm))}</td>
                <td className="px-3 py-2.5 sm:px-4">
                  <div className="flex items-center justify-end gap-2">
                    <div className="relative hidden h-2 flex-1 overflow-hidden rounded-full bg-line sm:block" aria-hidden>
                      <div className={`h-full rounded-full ${r.share >= typical ? "bg-route" : "bg-signal"}`} style={{ width: bar(r.share) }} />
                    </div>
                    <span className="w-11 shrink-0 text-right font-semibold">{Math.round(r.share * 100)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!all && shown.length > FIRST && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-3 w-full rounded-xl bg-card px-4 py-3 text-sm font-semibold shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--foreground)]"
        >
          Show all {shown.length} cars
        </button>
      )}
      <p className="mt-2 text-xs text-muted">
        Green bars: at or above the typical {Math.round(typical * 100)}%. Yellow: below it. The bar runs from 50% to 100% of the official range.
      </p>
    </div>
  );
}
