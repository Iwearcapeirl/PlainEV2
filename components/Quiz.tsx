"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { hasUnits, plain } from "@/lib/units";
import { useMemo, useState } from "react";
import CountrySwitch from "@/components/CountrySwitch";
import RangeRadar from "@/components/RangeRadar";
import TextSearch from "@/components/TextSearch";
import { allCars } from "@/lib/cars";
import { CONDITIONS, groupResults, type Condition } from "@/lib/market";
import { matchesAnswers } from "@/lib/match";
import {
  BODIES,
  BODY_ORDER,
  BUDGET_ORDER,
  BUDGETS,
  DEFAULT_ANSWERS,
  FILTERS,
  MORE_FILTERS,
  PRIORITIES,
  RANGES,
  answersFromParams,
  answersToQuery,
  availableFor,
  inCurrency,
  hasAnswers,
  moreFilterCount,
  type Answers,
  type FilterKey,
  type FilterOption,
  type PriorityId,
} from "@/lib/quiz";

/** The three core single-choice answers start empty; everything else starts on its default. */
type CoreKey = "budget" | "range" | "body";
type Draft = Omit<Answers, CoreKey> & Record<CoreKey, string | null>;

const STEPS = [
  {
    key: "condition",
    name: "New or used",
    title: "Are you buying new, used or either?",
    sub: "Used prices are typical asking prices for an average-mileage car, estimated from its age and price when new.",
  },
  {
    key: "budget",
    name: "Budget",
    title: "What’s your maximum budget?",
    sub: "Including VAT. For used cars we compare it with an estimated price for the oldest model year.",
  },
  {
    key: "range",
    name: "Range",
    title: "What’s the least real-world range you’d accept?",
    sub: "Real-world range is what to expect from a full charge in mixed driving, not the official WLTP figure.",
  },
  { key: "body", name: "Body style", title: "Which body style do you prefer?", sub: null },
  { key: "priority", name: "Priority", title: "What matters more to you?", sub: "Leave it on maximum range if you’re not sure." },
  {
    key: "more",
    name: "More filters",
    title: "Narrow it down (optional)",
    sub: "Skip anything you don’t mind about. Every filter starts on “No preference”.",
  },
] as const;

const ordered = (list: FilterOption[], order: string[]) => order.map((id) => list.find((o) => o.id === id)!);

const filled = (d: Draft): Answers => ({
  ...d,
  budget: d.budget ?? DEFAULT_ANSWERS.budget,
  range: d.range ?? DEFAULT_ANSWERS.range,
  body: d.body ?? DEFAULT_ANSWERS.body,
});

/** Results the way the results page counts them: each version once, however many model years it covers. */
const countMatches = (a: Answers) => groupResults(allCars.filter((c) => matchesAnswers(c, a))).length;
/** Everything on offer for this country and new/used choice, before any other answer. */
const countAvailable = (a: Answers) => groupResults(allCars.filter((c) => availableFor(c, a))).length;

export default function Quiz() {
  const router = useRouter();
  const params = useSearchParams();

  // Arriving from the homepage's budget picker (?budget=… on its own) starts at the range question with the budget set
  // (new or used stays on "either").
  const presetBudget = hasAnswers(params) ? null : BUDGETS.find((o) => o.id === params.get("budget"))?.id ?? null;
  const [step, setStep] = useState(presetBudget ? STEPS.findIndex((s) => s.key === "range") : 0);
  // Describing what you want is the default; the step-by-step quiz is the alternative. Links that carry
  // quiz answers (homepage budget picker, "Edit answers") open the quiz directly.
  const [mode, setMode] = useState<"text" | "quiz">(presetBudget || hasAnswers(params) ? "quiz" : "text");
  const [draft, setDraft] = useState<Draft>(() =>
    hasAnswers(params)
      ? answersFromParams(params)
      : { ...DEFAULT_ANSWERS, budget: presetBudget, range: null, body: null },
  );

  const last = STEPS.length - 1;
  const current = STEPS[step];
  const next = () => setStep((s) => Math.min(s + 1, last));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const answers = useMemo(() => filled(draft), [draft]);
  const liveCount = useMemo(() => countMatches(answers), [answers]);
  const availableCount = useMemo(() => countAvailable(answers), [answers]);
  // The cars still in play, for the radar: each answer switches the rest off.
  const lit = useMemo(() => new Set(allCars.filter((c) => matchesAnswers(c, answers)).map((c) => c.id)), [answers]);
  // How many cars each range option would leave, given the answers so far.
  const rangeCounts = useMemo(
    () => Object.fromEntries(RANGES.map((o) => [o.id, countMatches({ ...answers, range: o.id })])),
    [answers],
  );

  const chooseAndAdvance = (key: CoreKey, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    next();
  };
  const setFilter = (key: FilterKey, value: string) => setDraft((d) => ({ ...d, [key]: value }));
  const chooseCondition = (condition: Condition) => {
    setDraft((d) => ({ ...d, condition }));
    next();
  };
  const countrySwitch = (
    <CountrySwitch value={draft.country} onChange={(country) => setDraft((d) => ({ ...d, country }))} className="mb-6" />
  );
  const resetMore = () =>
    setDraft((d) => ({ ...d, ...Object.fromEntries(MORE_FILTERS.map((f) => [f.key, DEFAULT_ANSWERS[f.key]])) }));

  const coreDone = Boolean(draft.budget && draft.range && draft.body);
  const submit = () => {
    if (!coreDone) return;
    router.push(`/results?${answersToQuery(answers)}`);
  };

  const canContinue =
    current.key === "condition" || current.key === "priority" || current.key === "more" || draft[current.key as CoreKey] !== null;
  const extraCount = moreFilterCount(answers);

  if (mode === "text") {
    return (
      <section aria-labelledby="search-title" className="mx-auto grid max-w-5xl gap-x-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0">
          <div className="mb-10">
            <h1 id="search-title" className="font-wide text-4xl font-semibold leading-[1.05] text-balance sm:text-5xl">
              Find the right electric car for you.
            </h1>
            <p className="mt-4 max-w-[52ch] text-lg text-muted text-pretty">
              Tell us what you need in your own words, new or used. We’ll show you the five EVs that fit you best, ranked by
              real-world range.
            </p>
          </div>
          {countrySwitch}
          <TextSearch initial={params.get("q") ?? ""} country={draft.country} onUseQuiz={() => setMode("quiz")} />
        </div>
        <aside aria-label="Every car on sale" className="sticky top-6 hidden lg:block">
          <Instrument lit={lit} count={liveCount} of={availableCount} />
        </aside>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="question-title"
      className="mx-auto grid max-w-5xl gap-x-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
    >
      <div className="min-w-0">
      {step === 0 && (
        <div className="mb-10">
          <h1 className="font-wide text-4xl font-semibold leading-[1.05] text-balance sm:text-5xl">
            Find the right electric car for you.
          </h1>
          <p className="mt-4 max-w-[52ch] text-lg text-muted text-pretty">
            Five quick questions, then optional filters if you want to be more precise. We’ll show you the five EVs, new or
            used, that fit you best, ranked by real-world range.
          </p>
          <button
            type="button"
            onClick={() => setMode("text")}
            className="mt-4 text-[15px] font-semibold underline decoration-line decoration-2 underline-offset-4 hover:decoration-foreground"
          >
            Describe what you want instead
          </button>
        </div>
      )}

      {countrySwitch}

      {/* Progress: the questions, in order */}
      <div className="mb-8">
        <ol className="grid grid-cols-6 gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.key} aria-current={i === step ? "step" : undefined}>
              <span
                aria-hidden
                className={`block h-1.5 rounded-full transition-colors ${
                  i < step ? "bg-foreground" : i === step ? "bg-signal" : s.key === "more" ? "bg-line/60" : "bg-line"
                }`}
              />
              <span className={`mt-2 hidden text-xs sm:block ${i === step ? "font-semibold text-foreground" : "text-muted"}`}>
                {s.name}
                {s.key === "more" && <span className="font-normal text-muted"> (optional)</span>}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted sm:hidden">
            {step + 1} of {STEPS.length}: <span className="font-semibold text-foreground">{current.name}</span>
          </span>
          {step > 0 && (
            <span className="ml-auto text-muted tabular-nums" aria-live="polite">
              <span className="font-semibold text-foreground">{liveCount}</span> {liveCount === 1 ? "car matches" : "cars match"} so far
            </span>
          )}
        </div>
      </div>

      <Instrument lit={lit} count={liveCount} of={availableCount} compact className="mb-8 lg:hidden" />

      <div key={step} className="quiz-step">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="question-title" className="font-wide text-2xl font-semibold leading-tight text-balance sm:text-3xl">
            {current.title}
          </h2>
          {current.sub && <p className="mt-2 text-muted text-pretty">{current.sub}</p>}
        </div>
        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-muted hover:bg-accent-soft hover:text-foreground"
          >
            <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3 5 8l5 5" />
            </svg>
            Back
          </button>
        )}
      </div>

      {current.key !== "more" && (
        <div
          className={`mt-6 grid gap-2.5 ${current.key === "budget" ? "grid-cols-2 sm:grid-cols-3" : "sm:grid-cols-2"}`}
          role="radiogroup"
          aria-labelledby="question-title"
        >
          {current.key === "condition" &&
            CONDITIONS.map((o) => (
              <Option key={o.id} selected={draft.condition === o.id} hint={o.hint} onClick={() => chooseCondition(o.id)}>
                {o.label}
              </Option>
            ))}

          {current.key === "budget" &&
            ordered(BUDGETS, BUDGET_ORDER).map((o) => (
              <Option key={o.id} selected={draft.budget === o.id} onClick={() => chooseAndAdvance("budget", o.id)}>
                {inCurrency(o.label, draft.country)}
              </Option>
            ))}

          {current.key === "range" &&
            RANGES.map((o) => (
              <Option
                key={o.id}
                selected={draft.range === o.id}
                hint={o.hint}
                count={rangeCounts[o.id]}
                onClick={() => chooseAndAdvance("range", o.id)}
              >
                {o.label}
              </Option>
            ))}

          {current.key === "body" &&
            ordered(BODIES, BODY_ORDER).map((o) => (
              <Option key={o.id} selected={draft.body === o.id} onClick={() => chooseAndAdvance("body", o.id)}>
                {o.label}
              </Option>
            ))}

          {current.key === "priority" &&
            PRIORITIES.map((o) => (
              <Option
                key={o.id}
                selected={draft.priority === o.id}
                hint={o.hint}
                onClick={() => setDraft((d) => ({ ...d, priority: o.id as PriorityId }))}
              >
                {o.label}
              </Option>
            ))}
        </div>
      )}

      {current.key === "more" && (
        <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--line)]">
          {MORE_FILTERS.map((f) => (
            <fieldset key={f.key} className="px-4 py-4 sm:px-5">
              <legend className="float-left w-full">
                <span className="block text-[15px] font-semibold">{f.title}</span>
                {f.hint && <span className="mt-0.5 block text-sm text-muted">{f.hint}</span>}
              </legend>
              <div className="clear-both flex flex-wrap gap-1.5 pt-3" role="radiogroup" aria-label={f.title}>
                {FILTERS[f.key].map((o) => {
                  const on = answers[f.key] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setFilter(f.key, o.id)}
                      className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
                        on
                          ? "bg-ink font-semibold text-on-ink"
                          : "bg-background text-foreground shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--foreground)]"
                      }`}
                    >
                      <LabelText text={o.label} extraClass={`ml-1 text-xs font-normal ${on ? "text-on-ink/70" : "text-muted"}`} />
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {/* Actions */}
      {current.key === "priority" ? (
        <div className="mt-8 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={next}
            className="rounded-xl bg-card px-6 py-3.5 text-[15px] font-semibold shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1.5px_var(--foreground)]"
          >
            Add more filters{extraCount > 0 ? ` (${extraCount} set)` : ""}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!coreDone}
            className="rounded-xl bg-signal px-6 py-3.5 text-[15px] font-semibold text-signal-ink hover:brightness-95 disabled:opacity-40"
          >
            Show my matches
          </button>
        </div>
      ) : current.key === "more" ? (
        <div className="sticky bottom-3 z-10 mt-6 flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-on-ink shadow-[0_12px_32px_-12px_rgb(14_26_43/0.5)] sm:px-5">
          <div className="min-w-0 text-sm">
            <p className="tabular-nums" aria-live="polite">
              <span className="font-wide text-lg font-semibold">{liveCount}</span> {liveCount === 1 ? "car matches" : "cars match"}
            </p>
            {extraCount > 0 && (
              <button type="button" onClick={resetMore} className="text-on-ink/70 underline underline-offset-4 hover:text-on-ink">
                Clear these filters
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!coreDone}
            className="shrink-0 rounded-xl bg-signal px-5 py-3 text-[15px] font-semibold text-signal-ink hover:brightness-95 disabled:opacity-40"
          >
            Show my matches
          </button>
        </div>
      ) : (
        canContinue && (
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={next}
              className="w-full rounded-xl bg-accent px-6 py-3.5 text-[15px] font-semibold text-accent-contrast hover:opacity-90 sm:w-auto"
            >
              Next question
            </button>
          </div>
        )
      )}
      </div>
      </div>

      <aside aria-label="Cars still matching" className="sticky top-6 hidden lg:block">
        <Instrument lit={lit} count={liveCount} of={availableCount} />
      </aside>
    </section>
  );
}

/**
 * The quiz's instrument: the range radar with every car that no longer fits switched off, and the live count.
 * Decorative duplicate of the count announced in the progress row, so it stays out of the accessibility tree.
 */
function Instrument({
  lit,
  count,
  of,
  compact = false,
  className = "",
}: {
  lit: ReadonlySet<number>;
  count: number;
  /** Everything on offer for the buyer's country and new/used choice */
  of: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`on-ink rounded-2xl shadow-[var(--sc-e2)] ${compact ? "flex items-center gap-4 px-4 py-3" : "px-6 pb-6 pt-5"} ${className}`}
    >
      <div className={compact ? "order-2 min-w-0 flex-1" : ""}>
        <p className="text-xs text-on-ink/65">Still in the running</p>
        <p className="mt-0.5 flex items-baseline gap-1.5">
          <span className={`font-wide font-semibold tabular-nums ${compact ? "text-2xl" : "text-4xl"}`}>{count}</span>
          <span className="text-sm text-on-ink/65">of {of} cars</span>
        </p>
      </div>
      <RangeRadar lit={lit} className={compact ? "order-1 size-20 shrink-0" : "mt-4 w-full"} />
      {!compact && (
        <p className="mt-4 text-xs leading-relaxed text-on-ink/65">
          Each dot is a car on sale new in the UK. Further from the centre means more real-world range; clockwise means dearer.
        </p>
      )}
    </div>
  );
}

/**
 * An answer label; the bracketed part ("250+ miles (400+ km)") is shown smaller. Labels with miles/km versions
 * (lib/units.ts) are laid out once per unit, and CSS shows the one picked with the switch.
 */
function LabelText({ text, extraClass }: { text: string; extraClass: string }) {
  const one = (t: string) => {
    const [main, extra] = t.split(/ (?=\()/);
    return (
      <>
        {main}
        {extra && <span className={extraClass}>{extra}</span>}
      </>
    );
  };
  if (!hasUnits(text)) return one(text);
  return (
    <>
      <span className="u-mi">{one(plain(text, "mi"))}</span>
      <span className="u-km">{one(plain(text, "km"))}</span>
    </>
  );
}

/** Answer tile. */
function Option({
  children,
  hint,
  selected,
  multi = false,
  count,
  onClick,
}: {
  children: string;
  hint?: string;
  selected: boolean;
  multi?: boolean;
  /** Cars this option would leave, given the answers so far. */
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={`group flex w-full items-start gap-3 rounded-xl px-4 py-4 text-left transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.98] ${
        selected
          ? "bg-ink text-on-ink"
          : "bg-card text-foreground shadow-[0_0_0_1px_var(--line),var(--sc-e1)] hover:shadow-[0_0_0_1.5px_var(--foreground),var(--sc-e2)]"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 grid size-5 shrink-0 place-items-center text-[11px] font-bold leading-none ${multi ? "rounded-md" : "rounded-full"} ${
          selected ? "bg-signal text-signal-ink" : "shadow-[inset_0_0_0_1.5px_var(--line)]"
        }`}
      >
        {selected ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-wide block text-[16px] font-semibold leading-snug">
          <LabelText text={children} extraClass={`ml-1.5 font-sans text-sm font-normal ${selected ? "text-on-ink/70" : "text-muted"}`} />
        </span>
        {hint && <span className={`mt-1 block text-sm ${selected ? "text-on-ink/75" : "text-muted"}`}>{hint}</span>}
      </span>
      {count !== undefined && (
        <span className={`shrink-0 pt-0.5 text-sm tabular-nums ${selected ? "text-on-ink/75" : count === 0 ? "text-muted/70" : "text-muted"}`}>
          {count} {count === 1 ? "car" : "cars"}
        </span>
      )}
    </button>
  );
}
