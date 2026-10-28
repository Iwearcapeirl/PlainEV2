import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import Link from "next/link";
import { allCars, carHref, cars } from "@/lib/cars";
import AdSlot from "@/components/AdSlot";
import RangeRadar from "@/components/RangeRadar";
import RangeRings from "@/components/RangeRings";
import { formatGbp, formatMi, kmToMiles, miPerKwh } from "@/lib/format";
import { both } from "@/lib/units";
import { u } from "@/components/UnitText";
import { formatMoney, groupOffer, groupResults, onePerModel, yearsLabel, formatBand } from "@/lib/market";
import { matchesAnswers, rankCars } from "@/lib/match";
import { BUDGET_ORDER, BUDGETS, DEFAULT_ANSWERS } from "@/lib/quiz";
import { cheapest, dearest } from "@/lib/radar";
import { getRankingPage, rankingPages, shortLabel, type RankingPage } from "@/lib/rankings";
import { DATA_YEAR, SITE_NAME, SITE_URL, UPDATED_ISO, UPDATED_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME}: electric cars new and used, ranked by real-world range (${DATA_YEAR})` },
  description:
    "Find the right electric car, new or used. Every EV sold in the UK since 2011, with real-world range (not WLTP), estimated used prices, rankings and a quick quiz.",
  alternates: { canonical: "/" },
};

/** Ranking pages featured on the homepage, in display order (missing slugs are skipped). */
const FEATURED = [
  "real-range-under-40000",
  "real-range-under-50000",
  "best-value-under-30000",
  "most-efficient-suvs",
  "7-seat-evs",
  "lfp-evs",
];

/**
 * The homepage: hero, four ways in, the budget picker, buying used, real range vs WLTP, the range dial (new cars)
 * and popular rankings. Plain sections that scroll normally.
 */
export default function HomePage() {
  const featured = FEATURED.map(getRankingPage).filter((p): p is RankingPage => Boolean(p));
  const ranges = cars.map((c) => c.rangeKm).sort((a, b) => a - b);
  const mid = Math.floor(ranges.length / 2);
  const medianMiles = kmToMiles(ranges.length % 2 ? ranges[mid] : (ranges[mid - 1] + ranges[mid]) / 2);
  const longestMiles = kmToMiles(ranges[ranges.length - 1]);
  const medianKm = Math.round(ranges.length % 2 ? ranges[mid] : (ranges[mid - 1] + ranges[mid]) / 2);
  const longestKm = Math.round(ranges[ranges.length - 1]);
  const budgets = BUDGET_ORDER.map((id) => BUDGETS.find((b) => b.id === id)!).map((b) => ({
    ...b,
    // Models a UK buyer would see in the results for this budget, new and used (as the quiz counts them).
    count: groupResults(allCars.filter((c) => matchesAnswers(c, { ...DEFAULT_ANSWERS, budget: b.id }))).length,
  }));
  // Standout used buys under £15k: longest real-world range, one per model (as the results page would show them).
  const usedAnswers = { ...DEFAULT_ANSWERS, budget: "10-15k", condition: "used" as const };
  const usedPicks = onePerModel(groupResults(rankCars(allCars.filter((c) => matchesAnswers(c, usedAnswers)), "range")), 3);
  const firstYear = Math.min(...allCars.map((c) => c.yearFrom));

  return (
    <div className="-mb-16 -mt-8 sm:-mt-12">
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: `${SITE_URL}/`, inLanguage: "en-GB" },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: `${SITE_URL}/`,
            logo: `${SITE_URL}/icon-512.png`,
          },
        ]}
      />
      {/* 1 · Hero */}
      <section aria-labelledby="hero-title" className="bleed on-ink relative overflow-hidden">
        <div aria-hidden className="absolute right-[-30rem] top-1/2 h-[46rem] w-[46rem] -translate-y-1/2 sm:right-[-16rem] sm:h-[56rem] sm:w-[56rem] lg:right-[-6rem] max-sm:top-[85%]">
          <RangeRings
            animate
            highlights={[{ miles: medianMiles }, { miles: longestMiles, color: "var(--on-ink)" }]}
            className="h-full w-full text-on-ink/30"
          />
        </div>
        {/* keep the headline readable where it overlaps the rings */}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,var(--ink)_26%,transparent_68%)] max-sm:bg-[linear-gradient(180deg,var(--ink)_50%,transparent_80%)]" />

        <div className="relative mx-auto max-w-5xl px-4 pb-[clamp(5rem,12vw,9rem)] pt-[clamp(4rem,10vw,8rem)] sm:px-6">
          <h1 id="hero-title" className="font-wide max-w-[13ch] text-[2.4rem] font-semibold leading-[1.02] text-balance sm:text-[3.6rem] lg:text-[4.2rem]">
            Find the right electric car, new or used.
          </h1>
          <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-on-ink/85 text-pretty">
            Every EV sold in the UK since {firstYear}, with real-world range, honest used-price estimates and a quick quiz to
            find your match.
          </p>
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Link
              href="/quiz"
              className="rounded-xl bg-signal px-6 py-3.5 text-center text-[15px] font-semibold text-signal-ink transition-[filter,transform] duration-150 hover:brightness-95 active:scale-[0.97]"
            >
              Find your match
            </Link>
            <Link
              href="/cars"
              className="rounded-xl px-6 py-3.5 text-center text-[15px] font-semibold text-on-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--on-ink)_35%,transparent)] transition-shadow duration-150 hover:shadow-[inset_0_0_0_1.5px_var(--on-ink)]"
            >
              Browse all cars
            </Link>
            <Link
              href="/best"
              className="rounded-xl px-6 py-3.5 text-center text-[15px] font-semibold text-on-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--on-ink)_35%,transparent)] transition-shadow duration-150 hover:shadow-[inset_0_0_0_1.5px_var(--on-ink)]"
            >
              Rankings
            </Link>
            <Link
              href="/compare"
              className="rounded-xl px-6 py-3.5 text-center text-[15px] font-semibold text-on-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--on-ink)_35%,transparent)] transition-shadow duration-150 hover:shadow-[inset_0_0_0_1.5px_var(--on-ink)]"
            >
              Compare cars
            </Link>
          </div>
          <p className="mt-5 text-sm text-on-ink/85">Buying in Germany or the Netherlands? We show euro prices too.</p>
        </div>
      </section>

      {/* 2 · Four ways to start */}
      <section aria-labelledby="ways-title" className="mx-auto max-w-5xl py-[clamp(4rem,9vw,7rem)]">
        <h2 id="ways-title" className="font-wide text-3xl font-semibold leading-tight text-balance sm:text-4xl">
          Four ways to start
        </h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/quiz", title: "Answer 5 questions", text: "Tell us your budget, range and size, and get your top 5 matches, new or used." },
            { href: "/cars", title: "Browse every car", text: "Filter by price, range, size, towing and more, and sort any way you like." },
            { href: "/best", title: "See the rankings", text: "The best EVs for range, value, families and more, ten to a list." },
            { href: "/compare", title: "Compare up to 3 cars", text: "Side by side, with the best in each row marked in green." },
          ].map((w) => (
            <li key={w.href}>
              <Link
                href={w.href}
                className="group flex h-full flex-col rounded-2xl bg-card p-6 shadow-[0_0_0_1px_var(--line),var(--sc-e1)] transition-[box-shadow,transform] duration-150 hover:shadow-[0_0_0_2px_var(--ink),var(--sc-e2)] active:scale-[0.98]"
              >
                <span className="font-wide text-lg font-semibold">{w.title}</span>
                <span className="mt-2 leading-relaxed text-muted text-pretty">{w.text}</span>
                <span aria-hidden className="mt-auto pt-5 text-lg transition-transform duration-150 group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 3 · Start with your budget: the first quiz question, already answerable. */}
      <section aria-labelledby="start-title" className="bleed bg-accent-soft">
        <div className="mx-auto max-w-5xl px-4 py-[clamp(4.5rem,10vw,8rem)] sm:px-6">
          <h2 id="start-title" className="font-wide text-3xl font-semibold leading-tight sm:text-5xl">
            Start with your budget.
          </h2>
          <p className="mt-4 max-w-[48ch] text-lg text-muted text-pretty">
            Pick the most you want to spend. We'll count new and used cars, then ask a few quick questions to find your top 5.
          </p>
          <ul className="mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-3" aria-label="Your maximum budget">
            {budgets.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/quiz?budget=${b.id}`}
                  className="group flex h-full flex-col rounded-xl bg-card px-4 py-4 shadow-[0_0_0_1px_var(--line),var(--sc-e1)] transition-[box-shadow,transform] duration-150 hover:shadow-[0_0_0_2px_var(--ink),var(--sc-e2)] active:scale-[0.98] sm:px-5 sm:py-5"
                >
                  <span className="font-wide text-lg font-semibold">{b.label}</span>
                  <span className="mt-1 text-sm tabular-nums text-muted">
                    {b.chip ? `${b.count} new and used` : `All ${b.count}, new and used`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted">
            Used prices are typical asking prices, estimated and checked against real listings. Data updated{" "}
            <time dateTime={UPDATED_ISO}>{UPDATED_LABEL}</time>.
          </p>
        </div>
      </section>
      {/* 4 · Buying used */}
      <section aria-labelledby="used-title" className="mx-auto grid max-w-5xl gap-10 py-[clamp(4.5rem,10vw,8rem)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <h2 id="used-title" className="font-wide text-3xl font-semibold leading-tight text-balance sm:text-4xl">
            Thinking of buying used?
          </h2>
          <div className="mt-4 max-w-[46ch] leading-relaxed text-muted text-pretty">
            <p>
              Lots of people get into electric cars second-hand, and a few years old is often where the value is. For every car
              we estimate what a used one costs today, from its price new and its age.
            </p>
            <p className="mt-3">
              Batteries lose a little range as they age, so we show roughly how far an older car should still go too. Always
              check the real price and the battery health before you buy.
            </p>
          </div>
          <Link
            href="/cars?condition=used"
            className="mt-6 inline-block text-[15px] font-semibold underline decoration-signal decoration-2 underline-offset-4"
          >
            See all used EVs →
          </Link>
        </div>
        <div>
          <p className="text-sm font-semibold">Longest range, used, under £15k</p>
          <ol className="mt-3 grid gap-3">
            {usedPicks.map((g) => {
              const o = groupOffer(g, "uk", "used");
              return (
                <li key={g.key}>
                  <Link
                    href={carHref(g.car)}
                    className="flex items-center justify-between gap-4 rounded-xl bg-card px-5 py-4 shadow-[0_0_0_1px_var(--line)] transition-shadow duration-150 hover:shadow-[0_0_0_1.5px_var(--foreground)]"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm text-muted">
                        {g.car.make} · {yearsLabel(g)}
                      </span>
                      <span className="block font-semibold leading-snug">{g.car.variant}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs text-muted">Used (est.)</span>
                      <span className="font-wide block font-semibold tabular-nums">{o.used ? formatBand(o.used.low, o.used.high, "uk") : "–"}</span>
                      <span className="block text-xs text-muted">{u(formatMi(g.car.rangeKm))} range new</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <div className="mx-auto max-w-5xl">
        <AdSlot slot="home-mid" />
      </div>

      {/* 5 · Real range, not the lab figure: two real figures, set as a sentence. */}
      <section aria-labelledby="spread-title" className="mx-auto max-w-5xl py-[clamp(4.5rem,10vw,9rem)]">
        <h2 id="spread-title" className="font-wide max-w-[19ch] text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1.06] text-balance">
          The typical new electric car goes{" "}
          <span className="whitespace-nowrap">
            <Figure value={u(both(`${medianMiles}`, `${medianKm}`))} /> {u(both("miles", "km"))}
          </span>{" "}
          on a charge.
        </h2>
        <p className="font-wide mt-4 text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1.06] text-muted sm:ml-[18%]">
          The longest goes <Figure value={u(both(`${longestMiles}`, `${longestKm}`))} />.
        </p>

        <div className="mt-16 grid gap-10 sm:mt-20 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-16">
          <div className="max-w-[60ch] text-[17px] leading-relaxed text-pretty">
            <p>
              That's real-world range: what you can expect from a full charge in a mix of town, country and motorway driving.
            </p>
            <p className="mt-4 text-muted">
              The official WLTP figure comes from a lab test, and most drivers get noticeably less on the road, especially on
              motorways and in winter. So everything on {SITE_NAME} uses the real-world number.
            </p>
            <p className="mt-4 text-[15px]">
              <Link href="/methodology" className="font-semibold underline decoration-signal decoration-2 underline-offset-4">
                How we work out the figures →
              </Link>
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-6 self-start border-t border-line pt-5 md:grid-cols-1 md:gap-5">
            <div>
              <dt className="text-xs text-muted">EVs since {firstYear}</dt>
              <dd className="font-wide mt-0.5 text-2xl font-semibold tabular-nums">{allCars.length.toLocaleString("en-GB")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">On sale new in the UK</dt>
              <dd className="font-wide mt-0.5 text-2xl font-semibold tabular-nums">{cars.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Rankings</dt>
              <dd className="font-wide mt-0.5 text-2xl font-semibold tabular-nums">{rankingPages.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Updated</dt>
              <dd className="mt-1.5 text-sm font-semibold">
                <time dateTime={UPDATED_ISO}>{UPDATED_LABEL}</time>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 6 · The radar: every new car on sale in the UK at its real range. */}
      <section aria-labelledby="radar-title" className="bleed on-ink">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-[clamp(4.5rem,10vw,8rem)] sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <h2 id="radar-title" className="font-wide text-[1.7rem] font-semibold leading-[1.08] text-balance sm:text-[2.4rem]">
              Every new EV on sale in the UK, on one dial.
            </h2>
            <p className="mt-3 max-w-[42ch] text-on-ink/85 leading-relaxed text-pretty sm:text-lg">
              {cars.length} cars you can order new today. Each dot is one of them.
            </p>
            <dl className="mt-8 grid gap-5 border-t border-line pt-6">
              <div>
                <dt className="font-semibold">Further out means further on a charge.</dt>
                <dd className="mt-1 text-on-ink/85 leading-relaxed text-pretty">
                  A ring for every 100 miles of real-world range. The dashed yellow ring is the typical EV, at {u(both(`${medianMiles} miles`, `${medianKm} km`))}.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Clockwise, they get dearer.</dt>
                <dd className="mt-1 text-on-ink/85 leading-relaxed text-pretty">
                  From {formatGbp(cheapest.priceGbp)} at the top to {formatGbp(dearest.priceGbp)} just before it. The yellow marks are
                  £30k, £40k, £50k and £70k.
                </dd>
              </div>
            </dl>
            <Link
              href="/quiz"
              className="mt-8 inline-block rounded-xl bg-signal px-6 py-3.5 text-[15px] font-semibold text-signal-ink transition-[filter,transform] duration-150 hover:brightness-95 active:scale-[0.97]"
            >
              Find your match
            </Link>
          </div>
          <div className="grid place-items-center">
            <RangeRadar highlightMiles={medianMiles} className="aspect-square w-full max-w-[36rem]" />
          </div>
        </div>
      </section>

      {/* 7 · Popular rankings, set as primary-route signs: green, white keyline, yellow figures. */}
      <section aria-labelledby="rankings-title" className="bleed on-route">
        <div className="mx-auto max-w-5xl px-4 py-[clamp(4.5rem,10vw,8rem)] sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="rankings-title" className="font-wide text-3xl font-semibold leading-tight text-balance sm:text-4xl">
                Popular rankings
              </h2>
              <p className="mt-3 max-w-[48ch] leading-relaxed text-muted">
                Ten new cars to a list, all ranked on real-world figures. Here’s the number 1 in each.
              </p>
            </div>
            <Link href="/best" className="text-[15px] font-semibold underline decoration-signal decoration-2 underline-offset-4 hover:decoration-on-ink">
              All {rankingPages.length} rankings
            </Link>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => {
              const top = p.ranked[0];
              return (
                <li key={p.slug}>
                  <Link
                    href={`/best/${p.slug}`}
                    className="sign group flex h-full flex-col rounded-2xl bg-route p-6 [--sign-ground:var(--route)] transition-colors duration-150 hover:bg-[#00774a] hover:[--sign-ground:#00774a] sm:p-7"
                  >
                    <span className="text-[17px] font-semibold leading-snug text-pretty">{shortLabel(p)}</span>
                    <span className="mt-auto pt-6 text-xs text-muted">No. 1</span>
                    <span className="mt-0.5 text-[15px] font-medium leading-snug">
                      {top.make} {top.model}
                    </span>
                    <span className="mt-4 flex items-baseline gap-1.5 border-t border-line pt-4">
                      <span className="font-wide text-3xl font-semibold tabular-nums text-signal">
                        {u(p.metric === "efficiency" ? both(miPerKwh(top.whPerKm).toFixed(1), (top.whPerKm / 10).toFixed(1)) : both(String(kmToMiles(top.rangeKm)), String(top.rangeKm)))}
                      </span>
                      <span className="text-sm text-muted">{u(p.metric === "efficiency" ? both("mi/kWh", "kWh/100 km") : both("mi real range", "km real range"))}</span>
                      <span aria-hidden className="ml-auto text-lg transition-transform duration-150 group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

    </div>
  );
}

/** A real figure, underlined in signal yellow. */
function Figure({ value }: { value: React.ReactNode }) {
  return (
    <span className="tabular-nums shadow-[inset_0_-0.16em_0_var(--signal)]">
      {value}
    </span>
  );
}
