import type { Metadata } from "next";
import Link from "next/link";
import QuizCta from "@/components/QuizCta";
import { formatMi, formatMiPerKwh } from "@/lib/format";
import { rankingPages, SECTIONS, shortLabel } from "@/lib/rankings";
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
        Every list uses real-world figures, not WLTP. Prices are UK starting prices.
      </p>

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
                          {p.metric === "efficiency" ? formatMiPerKwh(top.whPerKm) : formatMi(top.rangeKm)}
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
    </section>
  );
}
