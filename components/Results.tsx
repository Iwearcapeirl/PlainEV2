"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AdSlot from "@/components/AdSlot";
import CarCard, { type CardMarket } from "@/components/CarCard";
import CarImage from "@/components/CarImage";
import CarLink from "@/components/CarLink";
import RangeBar from "@/components/RangeBar";
import CountrySwitch from "@/components/CountrySwitch";
import RefinePanel from "@/components/RefinePanel";
import { allCars, carHref, type Car } from "@/lib/cars";
import { formatAccel, formatMi, formatMiPerKwh } from "@/lib/format";
import {
  COUNTRIES,
  CONDITIONS,
  formatMoney,
  groupOffer,
  groupResults,
  miles,
  onePerModel,
  yearsLabel,
  type Country,
  type ResultGroup,
} from "@/lib/market";
import { describe, fieldByKey, isRefined, isSet, refine, refinementFromParams, writeRefinement, type Refinement } from "@/lib/fields";
import { matchedFilters, matchesAnswers, rankCars, relaxSearch, type SearchRelaxation } from "@/lib/match";
import { activeFilters, answersFromParams, answersToQuery, priorityOf, type Answers } from "@/lib/quiz";

/** How many cars a refined list shows at first, and how many more each "Show more" adds. */
const PAGE = 10;

export default function Results() {
  const router = useRouter();
  const params = useSearchParams();
  const answers = useMemo(() => answersFromParams(params), [params]);
  // Every car (any year, new or used) that matches the answers, best match first. Versions with the same name
  // merge into one result across their model years; the top 5 then shows at most one per model.
  const ranked = useMemo(() => rankCars(allCars.filter((c) => matchesAnswers(c, answers)), answers.priority), [answers]);
  const groups = useMemo(() => groupResults(ranked), [ranked]);
  const total = groups.length;
  const top = useMemo(() => onePerModel(groups, 5), [groups]);
  const market = (g: ResultGroup): CardMarket => ({
    country: answers.country,
    offer: groupOffer(g, answers.country, answers.condition),
    title: g.car.variant,
    years: yearsLabel(g),
  });
  const where = `${answers.condition === "both" ? "new and used" : answers.condition === "new" ? "new" : "used"}, ${
    answers.country === "uk" ? "in the UK" : answers.country === "nl" ? "in the Netherlands" : `in ${COUNTRIES[answers.country].label}`
  }`;

  const filters = activeFilters(answers);
  // Extra filters from the URL (set by a search or the "Filter and sort" panel) count as answers too.
  const urlRefinement = refinementFromParams(params);
  const extraChips = urlRefinement.filters.filter(isSet).map(describe);
  const urlSort = urlRefinement.sort ? fieldByKey(urlRefinement.sort) : undefined;
  const summary = [
    ...(answers.country !== "uk" ? [`Buying in ${COUNTRIES[answers.country].label}`] : []),
    ...(answers.condition !== "both" ? [CONDITIONS.find((c) => c.id === answers.condition)!.label] : []),
    ...(filters.length || extraChips.length ? [...filters.map((f) => f.chip), ...extraChips] : ["No filters"]),
    urlSort
      ? `Sorted by ${urlSort.label[0].toLowerCase()}${urlSort.label.slice(1)}, ${urlSort.kind === "number" ? (urlRefinement.dir === "asc" ? "low to high" : "high to low") : urlRefinement.dir === "asc" ? "A to Z" : "Z to A"}`
      : `Ranked by ${priorityOf(answers.priority).label.toLowerCase()}`,
  ];

  const [best, ...more] = top;
  const query = answersToQuery(answers);
  // Set when the results came from a typed description rather than the quiz.
  const searched = params.get("q")?.trim() || null;

  // Custom filters and sort, kept in the URL (f=, sort=, dir=) so refined results can be shared and survive Back.
  const [refinement, setRefinement] = useState<Refinement>(() => refinementFromParams(params));
  const [shown, setShown] = useState(PAGE);
  // New answers (e.g. a "loosen one answer" link) start from whatever that URL carries.
  useEffect(() => setRefinement(refinementFromParams(params)), [query]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => {
      const next = writeRefinement(new URLSearchParams(params.toString()), refinement).toString();
      if (next !== params.toString()) router.replace(`/results?${next}`, { scroll: false });
    }, 350);
    return () => clearTimeout(t);
  }, [refinement]); // eslint-disable-line react-hooks/exhaustive-deps

  const refined = isRefined(refinement);
  const list = useMemo(() => (refined ? groupResults(refine(ranked, refinement)) : []), [refined, ranked, refinement]);
  // Nothing to show (from the answers alone, or after extra filters): suggest one change that brings cars back.
  const empty = total === 0 || (refined && list.length === 0);
  const relaxations = useMemo(() => (empty ? relaxSearch(allCars, answers, refinement) : []), [empty, answers, refinement]);
  const relaxHref = (r: SearchRelaxation) => {
    const p = writeRefinement(new URLSearchParams(answersToQuery(r.answers)), r.refinement);
    if (searched) p.set("q", searched);
    return `/results?${p}`;
  };
  const setCountry = (country: Country) => {
    const p = new URLSearchParams(params.toString());
    if (country === "uk") p.delete("country");
    else p.set("country", country);
    router.push(`/results?${p}`);
  };
  const tryRelaxation = (r: SearchRelaxation) => {
    // Same quiz answers: only the extra filters change, so update them in place (the URL follows).
    if (answersToQuery(r.answers) === query) change(r.refinement);
    else router.push(relaxHref(r));
  };
  const change = (next: Refinement) => {
    setRefinement(next);
    setShown(PAGE);
  };
  const sortField = refinement.sort ? fieldByKey(refinement.sort) : undefined;
  const sortWords = sortField?.kind === "number" ? (refinement.dir === "asc" ? "low to high" : "high to low") : refinement.dir === "asc" ? "A to Z" : "Z to A";
  const listSummary = [
    sortField ? `Sorted by ${sortField.label[0].toLowerCase()}${sortField.label.slice(1)}, ${sortWords}` : "Sorted by best match",
    ...refinement.filters.filter(isSet).map(describe),
  ];

  return (
    <>
      <section aria-labelledby="results-title" className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 id="results-title" className="font-wide text-3xl font-semibold leading-tight sm:text-4xl">
              {total === 0 ? "No exact matches" : "Your top matches"}
            </h1>
            <p className="mt-2 text-muted">
              {total === 0
                ? `None of the EVs available ${where.split(", ")[1]} meet all of your answers.`
                : `${top.length} of ${total} matching ${total === 1 ? "car" : "cars"}, ${where}.`}
            </p>
          </div>
          <Link
            href={searched ? `/quiz?q=${encodeURIComponent(searched)}` : `/quiz?${query}`}
            className="rounded-xl bg-card px-4 py-2.5 text-sm font-semibold shadow-[0_0_0_1px_var(--line)] transition-shadow duration-150 hover:shadow-[0_0_0_1.5px_var(--foreground)]"
          >
            {searched ? "Edit search" : "Edit answers"}
          </Link>
        </div>

        <CountrySwitch value={answers.country} onChange={setCountry} className="mt-5" />

        {searched && (
          <p className="mt-5 max-w-[60ch] text-pretty">
            <span className="text-muted">You searched for </span>
            <q className="font-medium">{searched}</q>
            <span className="text-muted">. We read that as:</span>
          </p>
        )}

        <ul className={`${searched ? "mt-3" : "mt-5"} flex flex-wrap gap-1.5`} aria-label="Your answers">
          {summary.map((s) => (
            <li key={s} className="rounded-full bg-accent-soft px-3 py-1 text-sm text-foreground/80">
              {s}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-sm text-muted">
          <span aria-hidden className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-signal align-[-1px]" />
          Ranked by real-world range, not official WLTP figures.
        </p>
      </section>

      {total > 0 && (
        <div className="mx-auto mt-8 max-w-3xl">
          <RefinePanel value={refinement} onChange={change} scope={total} />
        </div>
      )}

      {total > 0 && refined ? (
        <section aria-labelledby="refined-title" className="mx-auto mt-8 max-w-3xl">
          <h2 id="refined-title" className="font-wide text-2xl font-semibold" aria-live="polite">
            {list.length} of {total} {total === 1 ? "car" : "cars"}
          </h2>
          <p className="mt-1 text-sm text-muted">{listSummary.join(". ")}.</p>
          {list.length > 0 ? (
            <>
              <ol className="mt-5 grid gap-4">
                {list.slice(0, shown).map((g, i) => (
                  <li key={g.key}>
                    <CarCard
                      car={g.car}
                      market={market(g)}
                      rank={i + 1}
                      matched={matchedFilters(g.car, answers)}
                      metric={
                        refinement.sort === "efficiency"
                          ? "efficiency"
                          : refinement.sort === "permile"
                            ? "value"
                            : refinement.sort === "accel" || (!refinement.sort && answers.priority === "acceleration")
                              ? "acceleration"
                              : "range"
                      }
                      returnLabel="your results"
                    />
                  </li>
                ))}
              </ol>
              {list.length > shown && (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="mt-6 w-full rounded-xl bg-card px-6 py-3.5 text-[15px] font-semibold shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1.5px_var(--foreground)]"
                >
                  Show {Math.min(PAGE, list.length - shown)} more ({list.length - shown} left)
                </button>
              )}
            </>
          ) : (
            <Loosen title="No cars match all of these" relaxations={relaxations} href={relaxHref} onPick={tryRelaxation} />
          )}
        </section>
      ) : total > 0 ? (
        <>
          <ol className="mx-auto mt-8 max-w-3xl sm:mt-10" aria-label="Your top matches">
            <li>
              <TopMatch group={best} market={market(best)} total={total} answers={answers} />
            </li>
          </ol>
          <AdSlot slot="results-mid" className="mt-10 max-w-3xl" />
          {more.length > 0 && (
            <section aria-labelledby="more-title" className="mx-auto max-w-3xl pt-[clamp(2.5rem,6vw,4rem)]">
              <h2 id="more-title" className="font-wide text-2xl font-semibold">
                More good matches
              </h2>
              <ol start={2} className="mt-5 grid gap-4">
                {more.map((g, i) => (
                  <li key={g.key}>
                    <CarCard
                      car={g.car}
                      market={market(g)}
                      rank={i + 2}
                      matched={matchedFilters(g.car, answers)}
                      metric={answers.priority === "acceleration" ? "acceleration" : "range"}
                      returnLabel="your results"
                    />
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      ) : (
        <div className="mx-auto mt-1 max-w-3xl">
          <Loosen title="Try loosening one answer" relaxations={relaxations} href={relaxHref} onPick={tryRelaxation} />
        </div>
      )}
    </>
  );
}

/** Suggestions for an empty result: each is one change, with how many cars it brings back. */
function Loosen({
  title,
  relaxations,
  href,
  onPick,
}: {
  title: string;
  relaxations: SearchRelaxation[];
  href: (r: SearchRelaxation) => string;
  onPick: (r: SearchRelaxation) => void;
}) {
  return (
    <div className="mt-5 rounded-2xl bg-card p-6 shadow-[0_0_0_1px_var(--line)]">
      <h2 className="font-wide text-lg font-semibold">{title}</h2>
      {relaxations.length > 0 ? (
        <>
          <p className="mt-1 text-muted">Change one thing to bring cars back:</p>
          <ul className="mt-4 grid gap-2">
            {relaxations.map((r) => (
              <li key={r.label}>
                <Link
                  href={href(r)}
                  onClick={(e) => {
                    e.preventDefault();
                    onPick(r);
                  }}
                  className="flex items-center justify-between gap-4 rounded-xl bg-background px-4 py-3.5 text-[15px] font-medium hover:bg-accent-soft"
                >
                  <span>{r.label}</span>
                  <span className="shrink-0 text-sm font-normal tabular-nums text-muted">
                    {r.count} {r.count === 1 ? "car" : "cars"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-muted">No single change brings cars back, so try changing a few of your answers or filters.</p>
      )}
    </div>
  );
}

/** The number 1 match: the car's photo, its real-world range and the headline figures, on the dark instrument ground. */
function TopMatch({ group, market, total, answers }: { group: ResultGroup; market: CardMarket; total: number; answers: Answers }) {
  const car: Car = group.car;
  const { offer: o, country } = market;
  const matched = matchedFilters(car, answers);
  const efficient = answers.priority === "efficiency";
  const quick = answers.priority === "acceleration";

  return (
    <article aria-labelledby="top-title" className="on-ink overflow-hidden rounded-2xl shadow-[var(--sc-e2)]">
      <CarImage
        src={car.image}
        credit={car.imageCredit}
        make={car.make}
        model={car.model}
        priority
        sizes="(min-width: 48rem) 48rem, 100vw"
      />

      <div className="p-5 sm:p-8">
        <p className="flex items-center gap-2.5 text-sm text-on-ink/80">
          <span
            aria-label="Rank 1"
            className="font-wide grid size-8 place-items-center rounded-md bg-signal text-sm font-semibold text-signal-ink"
          >
            1
          </span>
          Your best match, out of {total} {total === 1 ? "car" : "cars"}
        </p>
        <p className="mt-4 text-on-ink/80">{car.make}</p>
        <h2 id="top-title" className="font-wide text-[2rem] font-semibold leading-[1.04] text-balance sm:text-[2.8rem]">
          <CarLink href={carHref(car)} returnLabel="your results" className="hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-8">
            {market.title}
          </CarLink>
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-on-ink/80">
          {o.newPrice !== null && <span className="rounded bg-on-ink px-1.5 py-0.5 text-xs font-semibold text-ink">New</span>}
          {o.used && <span className="rounded bg-signal px-1.5 py-0.5 text-xs font-semibold text-signal-ink">Used</span>}
          <span>{market.years}</span>
        </p>

        <div className="mt-6">
          <RangeBar rangeKm={car.rangeKm} oneStopKm={car.oneStopKm} size="lg" />
          {o.used && (
            <p className="mt-2 text-sm text-on-ink/75">
              Range when new. A {o.used.year} car today: about {miles(o.used.rangeTodayKm)} miles (estimated, after battery wear).
            </p>
          )}
        </div>

        <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
          {o.newPrice !== null && (
            <div>
              <dt className="text-on-ink/70">New from</dt>
              <dd className="font-wide text-lg font-semibold tabular-nums">{formatMoney(o.newPrice, country)}</dd>
            </div>
          )}
          {o.used && (
            <div>
              <dt className="text-on-ink/70">Used from (est.)</dt>
              <dd className="font-wide text-lg font-semibold tabular-nums">{formatMoney(o.used.low, country)}</dd>
            </div>
          )}
          <div>
            <dt className={efficient ? "text-signal" : "text-on-ink/70"}>Efficiency</dt>
            <dd className="font-wide text-lg font-semibold tabular-nums">{formatMiPerKwh(car.whPerKm)}</dd>
          </div>
          <div>
            <dt className="text-on-ink/70">1-stop range</dt>
            <dd className="font-wide text-lg font-semibold tabular-nums">{formatMi(car.oneStopKm)}</dd>
          </div>
          <div>
            <dt className={quick ? "text-signal" : "text-on-ink/70"}>0–62 mph</dt>
            <dd className="font-wide text-lg font-semibold tabular-nums">{formatAccel(car.accelS)}</dd>
          </div>
        </dl>

        {matched.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Matches your answers">
            {matched.map((m) => (
              <li key={m.key} className="rounded-full bg-on-ink/10 px-2.5 py-1 text-xs font-medium text-on-ink">
                <span aria-hidden className="mr-1 text-signal">✓</span>
                {m.chip}
              </li>
            ))}
          </ul>
        )}

        <CarLink
          href={carHref(car)}
          returnLabel="your results"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-signal px-5 py-3 text-[15px] font-semibold text-signal-ink transition-[filter,transform] duration-150 hover:brightness-95 active:scale-[0.97]"
        >
          Specs, photos &amp; summary <span aria-hidden>→</span>
        </CarLink>
      </div>
    </article>
  );
}
