import type { Metadata } from "next";
import { u } from "@/components/UnitText";
import Link from "next/link";
import QuizCta from "@/components/QuizCta";
import { formatGbp, formatMi, formatMiPerKwh } from "@/lib/format";
import { rankingPages, SECTIONS, shortLabel } from "@/lib/rankings";
import { featuredVsPages, vsPages, vsTitle } from "@/lib/rivals";
import { usedRankingPages } from "@/lib/usedRankings";
import { DataSourceNote } from "@/components/EvdbLink";
import { DATA_YEAR, UPDATED_ISO, UPDATED_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: `UK electric car rankings ${DATA_YEAR}`,
  description:
    "Electric cars on sale in the UK, ranked by real-world range, efficiency and value for money, using real-world figures rather than WLTP.",
  alternates: { canonical: "/best" },
};

export default function RankingsIndex() {
  return (
    <section className="mx-auto max-w-3xl">
      <h1 className="font-wide text-3xl font-semibold leading-tight sm:text-[2.6rem]">UK electric car rankings {DATA_YEAR}</h1>
      <p className="mt-3 text-sm text-muted">
        <time dateTime={UPDATED_ISO}>Updated {UPDATED_LABEL}</time>
      </p>
      <p className="mt-5 max-w-[62ch] text-lg leading-relaxed">
        Every list uses real-world figures, not WLTP. New-car prices are UK starting prices; used prices are our estimates.
      </p>
      <DataSourceNote className="mt-3" />

      <div className="mt-8">
        <QuizCta compact />
      </div>

      {SECTIONS.map((s) => {
        const pages = rankingPages.filter((p) => s.kinds.includes(p.kind));
        if (!pages.length) return null;
        return (
          <section key={s.title} className="mt-12">
            <h2 className="font-wide text-lg font-semibold">{s.title}</h2>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {pages.map((p) => {
                const top = p.ranked[0];
                return (
                  <li key={p.slug}>
                    <Link
                      href={`/best/${p.slug}`}
                      className="flex h-full flex-col rounded-xl bg-card px-4 py-4 shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1.5px_var(--foreground)]"
                    >
                      <span className="text-[15px] font-semibold leading-snug">{shortLabel(p)}</span>
                      <span className="mt-auto pt-3 text-sm text-muted">
                        Top: {top.make} {top.model},{" "}
                        <span className="tabular-nums text-foreground">
                          {u(p.metric === "efficiency" ? formatMiPerKwh(top.whPerKm) : formatMi(top.rangeKm))}
                        </span>
                      </span>
                      <span className="text-xs text-muted">{p.ranked.length} cars compared</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className="mt-12">
        <h2 className="font-wide text-lg font-semibold">Used EVs</h2>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {usedRankingPages.map((p) => {
            const top = p.entries[0];
            return (
              <li key={p.slug}>
                <Link
                  href={`/best/${p.slug}`}
                  className="flex h-full flex-col rounded-xl bg-card px-4 py-4 shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1.5px_var(--foreground)]"
                >
                  <span className="text-[15px] font-semibold leading-snug">{p.label}</span>
                  <span className="mt-auto pt-3 text-sm text-muted">
                    Top: {top.car.make} {top.car.variant} ({top.pick.year}),{" "}
                    <span className="tabular-nums text-foreground">about {u(formatMi(top.pick.rangeTodayKm))} today</span>
                  </span>
                  <span className="text-xs text-muted">
                    {p.entries.length} models · from about {formatGbp(Math.min(...p.entries.map((e) => e.pick.typical)))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="head-to-head" className="mt-12 scroll-mt-6">
        <h2 className="font-wide text-lg font-semibold">Head-to-head</h2>
        <p className="mt-1 text-sm text-muted">Rival models side by side, with a verdict written from the figures.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {featuredVsPages().map((p) => (
            <li key={p.slug}>
              <Link
                href={`/vs/${p.slug}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3.5 text-[15px] font-semibold shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1.5px_var(--foreground)]"
              >
                {vsTitle(p)} <span aria-hidden>→</span>
              </Link>
            </li>
          ))}
        </ul>
        <details className="mt-4 rounded-xl bg-card p-4 shadow-[0_0_0_1px_var(--line)]">
          <summary className="cursor-pointer text-[15px] font-semibold">All {vsPages.length} comparisons</summary>
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {vsPages.map((p) => (
              <li key={p.slug}>
                <Link href={`/vs/${p.slug}`} className="underline decoration-line underline-offset-4 hover:decoration-foreground">
                  {vsTitle(p)}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </section>
  );
}
