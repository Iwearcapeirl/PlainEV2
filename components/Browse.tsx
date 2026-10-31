"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUnits } from "@/components/UnitsSwitch";
import { both, plain } from "@/lib/units";
import { u } from "@/components/UnitText";
import { useEffect, useId, useMemo, useState } from "react";
import AdSlot from "@/components/AdSlot";
import CarImage from "@/components/CarImage";
import CarLink from "@/components/CarLink";
import { CompareBar, CompareTick } from "@/components/ComparePicks";
import CountrySwitch from "@/components/CountrySwitch";
import RefinePanel from "@/components/RefinePanel";
import { allCars, carHref } from "@/lib/cars";
import { fieldByKey, isSet, refine, refinementFromParams, writeRefinement, type ChoiceField, type Refinement } from "@/lib/fields";
import { formatAccel, formatMi, kmToMiles } from "@/lib/format";
import { familyHref } from "@/lib/models";
import { CONDITIONS, COUNTRIES, budgetFitText, formatMoney, groupOffer, groupResults, usedBudgetFit, yearsLabel, type Condition, type ResultGroup, formatBand } from "@/lib/market";
import { matchesAnswers, rankCars, relaxSearch, type SearchRelaxation } from "@/lib/match";
import { BODIES, BUDGET_ORDER, BUDGETS, DEFAULT_ANSWERS, RANGES, answersFromParams, answersToQuery, budgetMax, inCurrency, type Answers } from "@/lib/quiz";
import { photoSubject } from "@/lib/photo";
import { DataSourceNote } from "@/components/EvdbLink";

/** Rows (models) shown at first, and added by each "Show more". */
const PAGE = 30;
/** Filters the page sets with its own controls (kept in the refinement, so they travel in the URL as f=…). */
const QUICK = ["name", "make"];
const MAKES = (fieldByKey("make") as ChoiceField).options;

const control =
  "w-full rounded-lg bg-card px-3 py-2 text-[15px] text-foreground shadow-[inset_0_0_0_1px_var(--line)] focus:shadow-[inset_0_0_0_2px_var(--ink)] focus:outline-none";

/** The URL for a set of answers and filters: only what differs from the defaults. */
function browseQuery(a: Answers, r: Refinement): string {
  const p = new URLSearchParams(answersToQuery(a));
  for (const k of ["budget", "range", "body", "priority"] as const) if (a[k] === DEFAULT_ANSWERS[k]) p.delete(k);
  return writeRefinement(p, r).toString();
}

/**
 * "All cars": every car you can buy in the chosen country (new, used or both), one row per model (its matching
 * versions open underneath, so the same photo isn't repeated), with quick filters, the full "Filter and sort" panel
 * and a "Show more" list.
 */
export default function Browse() {
  const router = useRouter();
  const params = useSearchParams();
  // Dropdown options can't hold the two unit spans, so they follow the switch directly.
  const units = useUnits();
  const id = useId();
  const [answers, setAnswers] = useState<Answers>(() => answersFromParams(params));
  const [refinement, setRefinement] = useState<Refinement>(() => refinementFromParams(params));
  const [shown, setShown] = useState(PAGE);

  // Keep the URL in step (debounced, so typing in the search box doesn't flood history).
  useEffect(() => {
    const t = setTimeout(() => {
      const next = browseQuery(answers, refinement);
      if (next !== params.toString()) router.replace(next ? `/cars?${next}` : "/cars", { scroll: false });
    }, 350);
    return () => clearTimeout(t);
  }, [answers, refinement]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (a: Answers, r: Refinement = refinement) => {
    setAnswers(a);
    setRefinement(r);
    setShown(PAGE);
  };
  const setAnswer = <K extends keyof Answers>(key: K, value: Answers[K]) => update({ ...answers, [key]: value });
  const quickValue = (key: string) => refinement.filters.find((f) => f.key === key)?.value ?? "";
  const setQuick = (key: string, value: string) =>
    update(answers, {
      ...refinement,
      filters: [...refinement.filters.filter((f) => f.key !== key), ...(value ? [{ key, value }] : [])],
    });

  // In the market the buyer chose, then the page's filters; longest range first unless they sort otherwise.
  const inScope = useMemo(() => groupResults(allCars.filter((c) => matchesAnswers(c, { ...DEFAULT_ANSWERS, country: answers.country, condition: answers.condition }))).length, [answers.country, answers.condition]);
  const ranked = useMemo(() => rankCars(allCars.filter((c) => matchesAnswers(c, answers)), answers.priority), [answers]);
  const versionList = useMemo(() => groupResults(refine(ranked, refinement, answers.country)), [ranked, refinement]);
  // One row per model family, in the order of its best-matching version.
  const list = useMemo(() => byModel(versionList), [versionList]);
  // How many versions each model has in this market at all, for "3 of 8 versions match".
  const familyTotals = useMemo(() => {
    const scope = groupResults(allCars.filter((c) => matchesAnswers(c, { ...DEFAULT_ANSWERS, country: answers.country, condition: answers.condition })));
    const t = new Map<string, number>();
    for (const g of scope) t.set(g.car.family, (t.get(g.car.family) ?? 0) + 1);
    return t;
  }, [answers.country, answers.condition]);
  const relaxations = useMemo(() => (list.length === 0 ? relaxSearch(allCars, answers, refinement) : []), [list.length, answers, refinement]);

  const quickSet = answers.budget !== "no-limit" || answers.range !== "any" || answers.body !== "any" || QUICK.some((k) => quickValue(k));
  const anySet = quickSet || answers.condition !== "both" || refinement.sort !== null || refinement.filters.some(isSet);
  const clearAll = () => update({ ...DEFAULT_ANSWERS, country: answers.country }, { filters: [], sort: null, dir: "asc" });
  const where = answers.country === "uk" ? "the UK" : answers.country === "nl" ? "the Netherlands" : COUNTRIES[answers.country].label;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-wide text-3xl font-semibold leading-tight sm:text-4xl">All electric cars</h1>
      <p className="mt-2 max-w-[62ch] text-muted">
        Every EV you can buy in {where}, new or second-hand, with real-world range (not WLTP). Used prices are estimates. Looking for one
        model? See{" "}
        <Link href="/models" className="font-semibold text-foreground underline decoration-signal decoration-2 underline-offset-4">
          every model A–Z
        </Link>
        .
      </p>
      <DataSourceNote className="mt-1.5" />

      <CountrySwitch value={answers.country} onChange={(country) => setAnswer("country", country)} className="mt-5" />

      {/* ---------- Quick filters ---------- */}
      <section aria-label="Quick filters" className="mt-5 rounded-2xl bg-card p-5 shadow-[0_0_0_1px_var(--line),var(--sc-e1)] sm:p-6">
        <div role="radiogroup" aria-label="New or used" className="flex flex-wrap gap-1.5">
          {CONDITIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={answers.condition === c.id}
              onClick={() => setAnswer("condition", c.id as Condition)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                answers.condition === c.id ? "bg-ink text-on-ink" : "bg-background shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--foreground)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <label className="col-span-2 grid gap-1 text-sm font-semibold lg:col-span-1">
            Search by name
            <input
              type="search"
              value={quickValue("name")}
              onChange={(e) => setQuick("name", e.target.value)}
              placeholder="e.g. Model 3, ID.3, Long Range"
              className={`${control} font-normal`}
            />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold">
            Make
            <select value={quickValue("make")} onChange={(e) => setQuick("make", e.target.value)} className={`${control} font-normal`}>
              <option value="">Any make</option>
              {MAKES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold">
            Body style
            <select value={answers.body} onChange={(e) => setAnswer("body", e.target.value)} className={`${control} font-normal`}>
              {BODIES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id === "any" ? "Any body style" : b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold">
            Budget
            <select value={answers.budget} onChange={(e) => setAnswer("budget", e.target.value)} className={`${control} font-normal`}>
              {BUDGET_ORDER.map((bid) => {
                const b = BUDGETS.find((o) => o.id === bid)!;
                return (
                  <option key={b.id} value={b.id}>
                    {inCurrency(b.label, answers.country)}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-semibold">
            Minimum range
            <select value={answers.range} onChange={(e) => setAnswer("range", e.target.value)} className={`${control} font-normal`}>
              {RANGES.map((r) => (
                <option key={r.id} value={r.id}>
                  {plain(r.label, units)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {anySet && (
          <button type="button" onClick={clearAll} className="mt-4 text-sm font-medium text-muted underline underline-offset-4 hover:text-foreground">
            Clear all filters
          </button>
        )}
      </section>

      <div className="mt-4">
        <RefinePanel
          country={answers.country}
          value={refinement}
          onChange={(r) => update(answers, r)}
          scope={inScope}
          hidden={QUICK}
          defaultSortLabel="Longest range"
          intro="Add any other filter from our data (towing, boot space, V2L, charging speed…) or change the order."
        />
      </div>

      {/* ---------- The list ---------- */}
      <section aria-labelledby={`${id}-count`} className="mt-8">
        <h2 id={`${id}-count`} className="font-wide text-xl font-semibold" aria-live="polite">
          {list.length === 0
            ? "No cars match these filters"
            : `Showing ${Math.min(shown, list.length)} of ${list.length} ${list.length === 1 ? "model" : "models"}${versionList.length > list.length ? ` (${versionList.length} versions)` : ""}`}
        </h2>

        {list.length > 0 ? (
          <>
            <ol className="mt-4 grid gap-3">
              {list.slice(0, shown).flatMap((g, i) => [
                <li key={g.family}>
                  {g.groups.length === 1 ? <Row group={g.groups[0]} answers={answers} /> : <ModelRow model={g} total={familyTotals.get(g.family) ?? g.groups.length} answers={answers} />}
                </li>,
                // An ad after the 10th car, then every 20 cars, never after the last row shown.
                (i + 1 - 10) % 20 === 0 && i + 1 >= 10 && i + 1 < Math.min(shown, list.length) ? (
                  <li key={`ad-${i}`}>
                    <AdSlot slot="cars-list" />
                  </li>
                ) : null,
              ])}
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
          <NoMatches relaxations={relaxations} onPick={(r) => update(r.answers, r.refinement)} onClear={clearAll} />
        )}
      </section>
      <CompareBar country={answers.country} />
    </div>
  );
}

interface ModelGroup {
  family: string;
  /** The model's matching versions (each across its model years), best match first. */
  groups: ResultGroup[];
}

/** Version groups gathered by model family, keeping the order of each family's best-matching version. */
function byModel(groups: ResultGroup[]): ModelGroup[] {
  const out = new Map<string, ModelGroup>();
  for (const g of groups) {
    const m = out.get(g.car.family);
    if (m) m.groups.push(g);
    else out.set(g.car.family, { family: g.car.family, groups: [g] });
  }
  return [...out.values()];
}

/**
 * A model with several matching versions: one photo, the spread of range and prices, and a "Show versions" list
 * of compact rows (no repeated photos) linking to each version's page. The row itself opens the model page.
 */
function ModelRow({ model, total, answers }: { model: ModelGroup; total: number; answers: Answers }) {
  const [open, setOpen] = useState(false);
  const lead = model.groups[0].car;
  const href = familyHref(model.family) ?? carHref(lead);
  const offers = model.groups.map((g) => groupOffer(g, answers.country, answers.condition));
  const news = offers.map((o) => o.newPrice).filter((p): p is number => p !== null);
  const useds = offers.map((o) => o.used).filter((x): x is NonNullable<typeof x> => x !== null);
  const used = useds.length ? useds.reduce((a, b) => (b.high < a.high ? b : a)) : null;
  const ranges = model.groups.flatMap((g) => g.versions.map((c) => c.rangeKm));
  const [lo, hi] = [Math.min(...ranges), Math.max(...ranges)];
  const accel = Math.min(...model.groups.map((g) => g.car.accelS));
  const fit = model.groups.map((g) => usedBudgetFit(g, answers.country, answers.condition, budgetMax(answers.budget))).find(Boolean) ?? null;
  const yearFrom = Math.min(...model.groups.map((g) => g.yearFrom));
  const stillNew = model.groups.some((g) => g.yearTo === null);
  const yearTo = stillNew ? null : Math.max(...model.groups.map((g) => g.yearTo ?? g.yearFrom));
  const credit = lead.imageCredit;
  const n = model.groups.length;
  const listId = `versions-${model.family.replace(/[^a-z0-9]+/gi, "-")}`;
  const name = model.family.startsWith(lead.make + " ") ? model.family.slice(lead.make.length + 1) : model.family;

  return (
    <article className="rounded-2xl bg-card shadow-[0_0_0_1px_var(--line)] transition-shadow hover:shadow-[0_0_0_1.5px_var(--foreground)] has-[a:focus-visible]:shadow-[0_0_0_2px_var(--foreground)]">
      <div className="relative grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 p-3 sm:grid-cols-[9.5rem_minmax(0,1fr)_auto] sm:items-center">
        <CarImage
          src={lead.image}
          credit={credit}
          make={lead.make}
          model={name}
          caption={false}
          frameClass="aspect-[4/3] rounded-xl"
          sizes="(min-width: 640px) 152px, 104px"
          link={{ href }}
        />

        <div className="min-w-0 self-center">
          <p className="text-sm text-muted">{lead.make}</p>
          <h3 className="font-wide text-[1.05rem] font-semibold leading-snug text-balance">
            {/* Stretched over the top of the row, so the row opens the model page; the photo and buttons sit above it. */}
            <Link href={href} className="after:absolute after:inset-0 after:rounded-t-2xl after:content-[''] focus-visible:outline-none">
              {name}
            </Link>
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            {news.length > 0 && <span className="rounded bg-ink px-1.5 py-0.5 text-xs font-semibold text-on-ink">New</span>}
            {used && <span className="rounded bg-signal px-1.5 py-0.5 text-xs font-semibold text-signal-ink">Used</span>}
            <span>{yearTo === null ? `${yearFrom} on` : yearFrom === yearTo ? yearFrom : `${yearFrom}–${yearTo}`}</span>
            <span aria-hidden>·</span>
            <span>{n < total ? `${n} of ${total} versions match` : `${n} versions`}</span>
          </p>
          {fit && <p className="mt-1 text-xs font-semibold text-route-ink">{budgetFitText(fit, answers.country)}</p>}
        </div>

        <dl className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm min-[420px]:grid-cols-4 sm:col-span-1 sm:grid-cols-2 sm:pr-2 md:grid-cols-4">
          {answers.condition !== "used" && <Stat label={fit ? "New (over budget)" : "New from"} value={news.length ? formatMoney(Math.min(...news), answers.country) : "–"} />}
          {answers.condition !== "new" && <Stat label="Used (est.)" value={used ? formatBand(used.low, used.high, answers.country) : "–"} />}
          <Stat label="Real range" value={lo === hi ? formatMi(lo) : both(`${kmToMiles(lo)}–${kmToMiles(hi)} mi`, `${Math.round(lo)}–${Math.round(hi)} km`)} />
          <Stat label="0–62 mph" value={n > 1 ? `from ${formatAccel(accel)}` : formatAccel(accel)} />
        </dl>
      </div>

      <div className="relative z-10 border-t border-line px-3 py-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-left text-sm font-semibold hover:text-foreground"
        >
          <span>{open ? "Hide versions" : `Show ${n} ${n === 1 ? "version" : "versions"}`}</span>
          <span aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>⌄</span>
        </button>
        {open && (
          <ul id={listId} className="mt-1 grid">
            {model.groups.map((g) => {
              const o = groupOffer(g, answers.country, answers.condition);
              return (
                <li key={g.key} className="flex items-center gap-3 border-t border-line py-2 first:border-t-0">
                  <div className="min-w-0 flex-1">
                    <CarLink href={carHref(g.car)} returnLabel="all cars" className="block font-medium leading-snug underline decoration-line underline-offset-4 hover:decoration-foreground">
                      {g.car.variant}
                    </CarLink>
                    <span className="block text-xs text-muted">
                      {yearsLabel(g)}
                      {o.newPrice !== null ? ` · ${formatMoney(o.newPrice, answers.country)} new` : ""}
                      {o.used ? ` · used ${formatBand(o.used.low, o.used.high, answers.country)}` : ""}
                    </span>
                    <CompareTick car={g.car} className="-ml-1.5 mt-0.5" />
                  </div>
                  <span className="shrink-0 text-right text-sm font-semibold tabular-nums">{u(formatMi(g.car.rangeKm))}</span>
                </li>
              );
            })}
          </ul>
        )}
        {familyHref(model.family) && (
          <Link href={familyHref(model.family)!} className="mt-1 block px-1 pb-1 text-sm font-semibold text-route-ink underline decoration-signal decoration-2 underline-offset-4">
            See the {model.family} model page →
          </Link>
        )}
      </div>

      {credit && (
        <p className="px-3 pb-2.5 text-[11px] leading-tight text-muted">
          {credit.note && <span className="mr-1">{credit.note}</span>}
          <a href={credit.source} target="_blank" rel="noopener noreferrer" className="hover:underline" title={photoSubject(credit)}>
            Photo: {credit.author}
          </a>
          {", "}
          <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer license" className="hover:underline">
            {credit.license}
          </a>
        </p>
      )}
    </article>
  );
}

/** One version of a car: photo, name, years, New/Used, prices, range and 0–62. Stacks into a small card on phones. */
function Row({ group, answers }: { group: ResultGroup; answers: Answers }) {
  const car = group.car;
  const o = groupOffer(group, answers.country, answers.condition);
  const fit = usedBudgetFit(group, answers.country, answers.condition, budgetMax(answers.budget));
  const credit = car.imageCredit;
  return (
    <article className="group relative grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-2xl bg-card p-3 shadow-[0_0_0_1px_var(--line)] transition-shadow hover:shadow-[0_0_0_1.5px_var(--foreground)] has-[a:focus-visible]:shadow-[0_0_0_2px_var(--foreground)] sm:grid-cols-[9.5rem_minmax(0,1fr)_auto] sm:items-center">
      <CarImage
        src={car.image}
        credit={credit}
        make={car.make}
        model={car.model}
        caption={false}
        frameClass="aspect-[4/3] rounded-xl"
        sizes="(min-width: 640px) 152px, 104px"
        link={{ href: carHref(car), returnLabel: "all cars" }}
      />

      <div className="min-w-0 self-center">
        <p className="text-sm text-muted">{car.make}</p>
        <h3 className="font-wide text-[1.05rem] font-semibold leading-snug text-balance">
          {/* Stretched over the whole row, so the row is the link; credit links sit above it. */}
          <CarLink href={carHref(car)} returnLabel="all cars" className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none">
            {car.variant}
          </CarLink>
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted">
          {o.newPrice !== null && <span className="rounded bg-ink px-1.5 py-0.5 text-xs font-semibold text-on-ink">New</span>}
          {o.used && <span className="rounded bg-signal px-1.5 py-0.5 text-xs font-semibold text-signal-ink">Used</span>}
          <span>{yearsLabel(group)}</span>
        </p>
        {fit && <p className="mt-1 text-xs font-semibold text-route-ink">{budgetFitText(fit, answers.country)}</p>}
        <CompareTick car={car} className="-ml-1.5 mt-1" />
      </div>

      <dl className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm min-[420px]:grid-cols-4 sm:col-span-1 sm:grid-cols-2 sm:pr-2 md:grid-cols-4">
        {answers.condition !== "used" && <Stat label={fit ? "New (over budget)" : "New from"} value={o.newPrice !== null ? formatMoney(o.newPrice, answers.country) : "–"} />}
        {answers.condition !== "new" && <Stat label="Used (est.)" value={o.used ? formatBand(o.used.low, o.used.high, answers.country) : "–"} />}
        <Stat label="Real range" value={formatMi(car.rangeKm)} />
        <Stat label="0–62 mph" value={formatAccel(car.accelS)} />
      </dl>

      {credit && (
        <p className="relative z-10 col-span-2 text-[11px] leading-tight text-muted sm:col-span-3">
          {credit.note && <span className="mr-1">{credit.note}</span>}
          <a href={credit.source} target="_blank" rel="noopener noreferrer" className="hover:underline" title={photoSubject(credit)}>
            Photo: {credit.author}
          </a>
          {", "}
          <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer license" className="hover:underline">
            {credit.license}
          </a>
        </p>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[5.5rem]">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-wide font-semibold tabular-nums">{u(value)}</dd>
    </div>
  );
}

function NoMatches({ relaxations, onPick, onClear }: { relaxations: SearchRelaxation[]; onPick: (r: SearchRelaxation) => void; onClear: () => void }) {
  return (
    <div className="mt-4 rounded-2xl bg-card p-6 shadow-[0_0_0_1px_var(--line)]">
      {relaxations.length > 0 && (
        <>
          <p className="text-muted">Change one thing to bring cars back:</p>
          <ul className="mt-3 grid gap-2">
            {relaxations.map((r) => (
              <li key={r.label}>
                <button
                  type="button"
                  onClick={() => onPick(r)}
                  className="flex w-full items-center justify-between gap-4 rounded-xl bg-background px-4 py-3.5 text-left text-[15px] font-medium hover:bg-accent-soft"
                >
                  <span>{r.label}</span>
                  <span className="shrink-0 text-sm font-normal tabular-nums text-muted">
                    {r.count} {r.count === 1 ? "car" : "cars"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        onClick={onClear}
        className="mt-4 rounded-xl bg-ink px-5 py-3 text-[15px] font-semibold text-on-ink hover:brightness-110"
      >
        Clear all filters
      </button>
    </div>
  );
}
