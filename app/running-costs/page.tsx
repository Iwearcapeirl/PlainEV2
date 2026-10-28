import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import JsonLd from "@/components/JsonLd";
import QuizCta from "@/components/QuizCta";
import RunningCalc from "@/components/RunningCalc";
import { u } from "@/components/UnitText";
import { carHref } from "@/lib/cars";
import { breadcrumbLd } from "@/lib/jsonld";
import { getRankingPage } from "@/lib/rankings";
import { assumptionsText, formatPencePerMile, formatPounds, runningCost, RUNNING_DEFAULTS } from "@/lib/running";
import { plainDeep } from "@/lib/units";

const RANKING = "cheapest-evs-to-run";
const petrol = runningCost(0, RUNNING_DEFAULTS);

export const metadata: Metadata = plainDeep({
  title: "EV running costs calculator: what an electric car costs to charge",
  description:
    `What any electric car costs to charge per mile, month and year, at home, on rapid chargers or a mix, compared with petrol. ` +
    `Uses real-world efficiency and today's UK prices, which you can change.`,
  alternates: { canonical: "/running-costs" },
  openGraph: {
    title: "EV running costs calculator",
    description: "What any electric car costs to charge, compared with petrol, using real-world efficiency and today's UK prices.",
    type: "website",
    images: [{ url: `/api/og/best/${RANKING}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
});

export default function RunningCostsPage() {
  const ranking = getRankingPage(RANKING);
  const top = ranking?.ranked.slice(0, 10) ?? [];

  return (
    <article className="mx-auto max-w-5xl">
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Running costs", path: "/running-costs" },
        ])}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden>/</span> <span className="text-foreground">Running costs</span>
      </nav>
      <h1 className="font-wide mt-3 text-3xl font-semibold leading-tight text-balance sm:text-4xl">EV running costs calculator</h1>
      <p className="mt-3 max-w-[64ch] text-lg leading-relaxed text-pretty">
        What an electric car costs to charge, from its real-world efficiency (not the official figure), compared with a petrol car. Add up to
        three cars, and change the figures to match your mileage and tariff.
      </p>

      <div className="mt-6">
        <Suspense fallback={<p className="py-10 text-sm text-muted">Loading the calculator…</p>}>
          <RunningCalc />
        </Suspense>
      </div>

      <section aria-labelledby="how-title" className="mt-12 max-w-[66ch]">
        <h2 id="how-title" className="font-wide text-xl font-semibold sm:text-2xl">How it works</h2>
        <div className="mt-3 grid gap-3 leading-relaxed text-pretty">
          <p>
            Each car&rsquo;s energy use comes from its real-world efficiency on EV Database. We add about 10% for energy lost while charging at home
            and 5% on a rapid charger, then multiply by the price per kWh for the share you charge in each place.
          </p>
          <p>
            Unless you change them, the figures are UK averages: {u(assumptionsText())}. Over that distance the petrol car costs about{" "}
            {formatPounds(petrol.petrolPerYear / 12)} a month in fuel.
          </p>
          <p>
            Charging at home is usually far cheaper than rapid charging, and an EV tariff with cheap overnight electricity cuts the cost further.
            Cold weather, motorway speeds and short trips use more energy, so winter costs run higher than these averages.
          </p>
        </div>
      </section>

      {ranking && top.length > 0 && (
        <section aria-labelledby="cheapest-title" className="mt-12">
          <h2 id="cheapest-title" className="font-wide text-xl font-semibold sm:text-2xl">Cheapest EVs to run</h2>
          <p className="mt-2 text-sm text-muted">At the UK-average figures above, new cars on sale today.</p>
          <ol className="mt-4 overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--line)]">
            {top.map((c, i) => {
              const r = runningCost(c.whPerKm, RUNNING_DEFAULTS);
              return (
                <li key={c.id} className="flex items-baseline gap-3 border-t border-line px-4 py-3 first:border-t-0 sm:px-5">
                  <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-muted">{i + 1}</span>
                  <Link href={carHref(c)} className="min-w-0 flex-1 font-semibold hover:underline">
                    <span className="font-normal text-muted">{c.make} </span>
                    {c.model}
                  </Link>
                  <span className="shrink-0 text-right text-sm tabular-nums">
                    <span className="font-semibold">{formatPounds(r.perMonth)}</span>
                    <span className="text-muted"> a month</span>
                    <span className="block text-xs text-muted">{u(formatPencePerMile(r.perMile))}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-sm">
            <Link href={`/best/${RANKING}`} className="font-semibold underline decoration-signal decoration-2 underline-offset-4">
              See all {ranking.ranked.length} cars, ranked →
            </Link>
          </p>
        </section>
      )}

      <div className="mt-12">
        <QuizCta />
      </div>
    </article>
  );
}
