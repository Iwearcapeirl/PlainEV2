"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { u } from "@/components/UnitText";

/** One row of a model's versions table (built on the server; text may carry miles/km pairs, see lib/units.ts). */
export interface VersionRow {
  href: string;
  name: string;
  years: string;
  rangeKm: number;
  range: string;
  whPerKm: number;
  efficiency: string;
  batteryKwh: number;
  fastchargeKw: number;
  /** New price on sale, else null */
  price: number | null;
  priceText: string;
}

export interface VersionTable {
  title: string;
  rows: VersionRow[];
}

type SortKey = "range" | "efficiency" | "battery" | "charging" | "price";
const SORTS: { key: SortKey; label: string; value: (r: VersionRow) => number | null; dir: 1 | -1 }[] = [
  { key: "range", label: "Range", value: (r) => r.rangeKm, dir: -1 },
  { key: "efficiency", label: "Efficiency", value: (r) => r.whPerKm, dir: 1 },
  { key: "battery", label: "Battery", value: (r) => r.batteryKwh, dir: -1 },
  { key: "charging", label: "Charging", value: (r) => r.fastchargeKw, dir: -1 },
  { key: "price", label: "Price", value: (r) => r.price, dir: 1 },
];

/**
 * Every version of a model, grouped (on sale, older …). Wide screens get a table whose column headings sort it;
 * phones get compact rows with the same sort as a row of buttons. Server order (newest first) until a sort is picked.
 */
export default function ModelVersions({ groups }: { groups: VersionTable[] }) {
  const [sort, setSort] = useState<SortKey | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return groups;
    const s = SORTS.find((x) => x.key === sort)!;
    return groups.map((g) => ({
      ...g,
      rows: [...g.rows].sort((a, b) => {
        const [x, y] = [s.value(a), s.value(b)];
        if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
        return (x - y) * s.dir;
      }),
    }));
  }, [groups, sort]);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-1.5 text-sm" role="group" aria-label="Sort versions by">
        <span className="mr-1 text-muted">Sort by</span>
        {[{ key: null, label: "Newest" } as const, ...SORTS].map((s) => (
          <button
            key={s.label}
            type="button"
            aria-pressed={sort === s.key}
            onClick={() => setSort(s.key)}
            className={`rounded-full px-3 py-1.5 ${sort === s.key ? "bg-ink font-semibold text-on-ink" : "bg-card shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--foreground)]"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sorted.map((g) => (
        <div key={g.title} className="mt-6">
          <h3 className="font-semibold">
            {g.title} <span className="font-normal text-muted">· {g.rows.length}</span>
          </h3>

          {/* Phones: compact rows */}
          <ul className="mt-2 overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--line)] md:hidden">
            {g.rows.map((r) => (
              <li key={r.href} className="border-t border-line first:border-t-0">
                <Link href={r.href} className="flex items-center gap-3 px-4 py-3 hover:bg-accent-soft">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug">{r.name}</span>
                    <span className="block text-xs text-muted">
                      {r.years} · {u(r.efficiency)} · {r.batteryKwh} kWh · {r.fastchargeKw} kW
                    </span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block font-semibold">{u(r.range)}</span>
                    <span className="block text-xs text-muted">{r.priceText}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Wider screens: a table */}
          <div className="mt-2 hidden overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--line)] md:block">
            {/* Fixed column widths so the tables for each group line up. */}
            <table className="w-full table-fixed text-sm tabular-nums">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[13%]" />
                <col className="w-[15%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
              </colgroup>
              <thead className="bg-accent-soft text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Version</th>
                  {SORTS.map((s) => (
                    <th key={s.key} scope="col" className="px-3 py-2.5 text-right font-medium" aria-sort={sort === s.key ? (s.dir === -1 ? "descending" : "ascending") : undefined}>
                      <button type="button" onClick={() => setSort(sort === s.key ? null : s.key)} className="hover:text-foreground hover:underline">
                        {s.label}
                        {sort === s.key ? " ↓" : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.href} className="border-t border-line hover:bg-accent-soft">
                    <th scope="row" className="px-4 py-2.5 text-left font-medium">
                      <Link href={r.href} className="hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4">
                        {r.name}
                      </Link>
                      <span className="block text-xs font-normal text-muted">{r.years}</span>
                    </th>
                    <td className="px-3 py-2.5 text-right font-semibold">{u(r.range)}</td>
                    <td className="px-3 py-2.5 text-right">{u(r.efficiency)}</td>
                    <td className="px-3 py-2.5 text-right">{r.batteryKwh} kWh</td>
                    <td className="px-3 py-2.5 text-right">{r.fastchargeKw} kW</td>
                    <td className="px-3 py-2.5 text-right">{r.priceText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
