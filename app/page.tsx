import type { Metadata } from "next";
import Link from "next/link";
import { carHref, cars } from "@/lib/cars";
import RangeBar from "@/components/RangeBar";
import RangeRadar from "@/components/RangeRadar";
import RangeRings from "@/components/RangeRings";
import { formatGbp, formatMi, formatMiPerKwh, kmToMiles } from "@/lib/format";
import { BUDGET_ORDER, BUDGETS } from "@/lib/quiz";
import { cheapest, dearest } from "@/lib/radar";
import { byRange, getRankingPage, rankingPages, shortLabel, type RankingPage } from "@/lib/rankings";
import { DATA_YEAR, SITE_NAME, UPDATED_ISO, UPDATED_LABEL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME}: UK electric cars ranked by real-world range (${DATA_YEAR})` },
  description:
    "Compare electric cars on sale in the UK by real-world range rather than WLTP. Take a quick quiz or browse rankings by budget, body style and battery.",
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
 * The homepage: a hero, two real figures, the range radar, the longest ranges, popular rankings,
 * and the first quiz question as the close. Plain sections that scroll normally.
 */
export default function HomePage() {
  const featured = FEATURED.map(getRankingPage).filter((p): p is RankingPage => Boolean(p));
  const longest = [...cars].sort(byRange).slice(0, 3);
  const ranges = cars.map((c) => c.rangeKm).sort((a, b) => a - b);
  const mid = Math.floor(ranges.length / 2);
  const medianMiles = kmToMiles(ranges.length % 2 ? ranges[mid] : (ranges[mid - 1] + ranges[mid]) / 2);
  const longestMiles = kmToMiles(ranges[ranges.length - 1]);
  const budgets = BUDGET_ORDER.map((id) => BUDGETS.find((b) => b.id === id)!).map((b) => ({
    ...b,
    count: b.chip ? cars.filter(b.test).length : null,
  }));

  return (
    <div className="-mb-16 -mt-8 sm:-mt-12">
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
            How far will an electric car really go?
          </h1>
          <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-on-ink/75 text-pretty">
            All {cars.length} EVs on sale in the UK, ranked by real-world range instead of the lab figure.
          </p>
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/quiz"
              className="rounded-xl bg-signal px-6 py-3.5 text-center text-[15px] font-semibold text-signal-ink transition-[filter,transform] duration-150 hover:brightness-95 active:scale-[0.97]"
            >
              Find your match
            </Link>
            <Link
              href="/best"
              className="rounded-xl px-6 py-3.5 text-center text-[15px] font-semibold text-on-ink shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--on-ink)_35%,transparent)] transition-shadow duration-150 hover:shadow-[inset_0_0_0_1.5px_var(--on-ink)]"
            >
              Browse rankings
            </Link>
          </div>
        </div>
      </section>

      {/* 2 · Two real figures, set as a sentence. */}
      <section aria-labelledby="spread-title" className="mx-auto max-w-5xl py-[clamp(4.5rem,10vw,9rem)]">
        <h2 id="spread-title" className="font-wide max-w-[19ch] text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1.06] text-balance">
          The typical electric car on sale goes{" "}
          <span className="whitespace-nowrap">
            <Figure value={medianMiles} /> miles
          </span>{" "}
          on a charge.
        </h2>
        <p className="font-wide mt-4 text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1.06] text-muted sm:ml-[18%]">
          The longest goes <Figure value={longestMiles} />.
        </p>

        <div className="mt-16 grid gap-10 sm:mt-20 md:grid-cols-[minmax(0,1fr)_15rem] md:gap-16">
          <div className="max-w-[60ch] text-[17px] leading-relaxed text-pretty">
            <p>
              Those are real-world ranges: what to expect from a full charge in a mix of town, country and motorway driving.
            </p>
            <p className="mt-4 text-muted">
              The official WLTP figure is a standard lab test. It is useful for comparing cars, but most drivers get noticeably
              less on the road, especially on motorways and in cold weather. So every ranking here uses the real-world number.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-6 self-start border-t border-line pt-5 md:grid-cols-1 md:gap-5">
            <div>
              <dt className="text-xs text-muted">Cars compared</dt>
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

      {/* 3 · The radar: every car on sale at its real range. */}
      <section aria-labelledby="radar-title" className="bleed on-ink">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-[clamp(4.5rem,10vw,8rem)] sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <h2 id="radar-title" className="font-wide text-[1.7rem] font-semibold leading-[1.08] text-balance sm:text-[2.4rem]">
              Every electric car on sale in the UK, on one dial.
            </h2>
            <p className="mt-3 max-w-[42ch] text-on-ink/75 leading-relaxed text-pretty sm:text-lg">
              {cars.length} cars. Each dot is one of them.
            </p>
            <dl className="mt-8 grid gap-5 border-t border-line pt-6">
              <div>
                <dt className="font-semibold">Further out means further on a charge.</dt>
                <dd className="mt-1 text-on-ink/75 leading-relaxed text-pretty">
                  A ring for every 100 miles of real-world range. The dashed yellow ring is the typical EV, at {medianMiles} miles.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Clockwise, they get dearer.</dt>
                <dd className="mt-1 text-on-ink/75 leading-relaxed text-pretty">
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

      {/* 4 · The longest ranges, on the one scale used across the site. */}
      <section aria-labelledby="longest-title" className="mx-auto grid max-w-5xl gap-10 py-[clamp(4.5rem,10vw,9rem)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <h2 id="longest-title" className="font-wide text-3xl font-semibold leading-tight text-balance sm:text-4xl">
            The longest real-world ranges on sale
          </h2>
          <p className="mt-4 max-w-[44ch] leading-relaxed text-muted text-pretty">
            Yellow is real-world range. The hatched part is how far you get with one 15-minute charging stop. Every bar on the
            site uses the same 600-mile scale.
          </p>
        </div>
        <ol className="grid gap-9">
          {longest.map((c) => (
            <li key={c.id}>
              <p className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <Link
                  href={carHref(c)}
                  className="text-[15px] font-semibold underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-signal"
                >
                  {c.make} {c.model}
                </Link>
                <span className="tabular-nums text-muted">from {formatGbp(c.priceGbp)}</span>
              </p>
              <RangeBar rangeKm={c.rangeKm} oneStopKm={c.oneStopKm} />
            </li>
          ))}
        </ol>
      </section>

      {/* 5 · Popular rankings, set as primary-route signs: green, white keyline, yellow figures. */}
      <section aria-labelledby="rankings-title" className="bleed on-route">
        <div className="mx-auto max-w-5xl px-4 py-[clamp(4.5rem,10vw,8rem)] sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="rankings-title" className="font-wide text-3xl font-semibold leading-tight text-balance sm:text-4xl">
                Popular rankings
              </h2>
              <p className="mt-3 max-w-[48ch] leading-relaxed text-muted">
                Ten cars per list, ranked on the same real-world figures. The number 1 in each is shown.
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
                        {p.metric === "efficiency" ? formatMiPerKwh(top.whPerKm).replace(" mi/kWh", "") : kmToMiles(top.rangeKm)}
                      </span>
                      <span className="text-sm text-muted">{p.metric === "efficiency" ? "mi/kWh" : "mi real range"}</span>
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

      {/* 6 · Close: the first quiz question, already answerable. */}
      <section aria-labelledby="start-title" className="bleed bg-accent-soft">
        <div className="mx-auto max-w-5xl px-4 py-[clamp(4.5rem,10vw,8rem)] sm:px-6">
          <h2 id="start-title" className="font-wide text-3xl font-semibold leading-tight sm:text-5xl">
            Start with your budget.
          </h2>
          <p className="mt-4 max-w-[48ch] text-lg text-muted text-pretty">
            Pick one and the quiz carries on from there: range, body style and what matters most. Then your top 5.
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
                    {b.count === null ? `All ${cars.length} cars` : `${b.count} cars`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted">
            Shortest range on sale: {formatMi(ranges[0])}. Longest: {formatMi(ranges[ranges.length - 1])}. Data updated{" "}
            <time dateTime={UPDATED_ISO}>{UPDATED_LABEL}</time>.
          </p>
        </div>
      </section>
    </div>
  );
}

/** A real figure, underlined in signal yellow. */
function Figure({ value }: { value: number }) {
  return (
    <span className="tabular-nums shadow-[inset_0_-0.16em_0_var(--signal)]">
      {value}
    </span>
  );
}
