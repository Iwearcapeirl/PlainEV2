"use client";

import { useId } from "react";
import {
  FIELDS,
  SORT_FIELDS,
  defaultValue,
  fieldByKey,
  isSet,
  type CustomFilter,
  type Field,
  type Refinement,
  unitOf,
} from "@/lib/fields";
import type { Country } from "@/lib/market";

const control =
  "rounded-lg bg-card px-3 py-2 text-[15px] text-foreground shadow-[inset_0_0_0_1px_var(--line)] focus:shadow-[inset_0_0_0_2px_var(--ink)] focus:outline-none";

/**
 * "Filter and sort" box on the results page. Filters narrow the cars that already match the reader's answers;
 * the sort replaces the default best-match order. All state lives in the parent (and the URL).
 */
export default function RefinePanel({
  value,
  onChange,
  scope,
  intro,
  defaultSortLabel = "Best match",
  hidden = [],
  country = "uk",
}: {
  value: Refinement;
  onChange: (next: Refinement) => void;
  /** How many cars the filters start from (those matching the reader's answers). */
  scope: number;
  /** Replaces the line under the heading. */
  intro?: string;
  /** Name of the default order in the sort menu. */
  defaultSortLabel?: string;
  /** Filter keys the page sets with its own controls: not listed or offered here, and kept by "Clear all". */
  hidden?: string[];
  /** The buyer's country, for prices shown in their currency. */
  country?: Country;
}) {
  const id = useId();
  const used = new Set(value.filters.map((f) => f.key));
  const isHidden = (key: string) => hidden.includes(key);
  const visible = value.filters.filter((f) => !isHidden(f.key));
  const refinedHere = value.sort !== null || visible.some(isSet);
  const sortField = value.sort ? fieldByKey(value.sort) : undefined;
  const words = sortField && sortField.kind !== "number" ? (["A to Z", "Z to A"] as const) : (["Low to high", "High to low"] as const);

  const setFilter = (i: number, next: CustomFilter) => onChange({ ...value, filters: value.filters.map((f, j) => (j === i ? next : f)) });
  const removeFilter = (i: number) => onChange({ ...value, filters: value.filters.filter((_, j) => j !== i) });
  const addFilter = (key: string) => {
    const field = fieldByKey(key);
    if (field) onChange({ ...value, filters: [...value.filters, { key, value: defaultValue(field) }] });
  };

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl bg-card p-5 shadow-[0_0_0_1px_var(--line),var(--sc-e1)] sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`${id}-title`} className="font-wide text-lg font-semibold">
          Filter and sort
        </h2>
        {refinedHere && (
          <button
            type="button"
            onClick={() => onChange({ filters: value.filters.filter((f) => isHidden(f.key)), sort: null, dir: "asc" })}
            className="text-sm font-medium text-muted underline underline-offset-4 hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        {intro ?? `Narrow down the ${scope} ${scope === 1 ? "car" : "cars"} that match your answers, by anything in our data.`}
      </p>

      {/* Sort */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label htmlFor={`${id}-sort`} className="w-full text-sm font-semibold sm:w-auto">
          Sort by
        </label>
        <select
          id={`${id}-sort`}
          value={value.sort ?? ""}
          onChange={(e) => onChange({ ...value, sort: e.target.value || null })}
          className={`${control} w-full sm:w-auto`}
        >
          <option value="">{defaultSortLabel}</option>
          {SORT_FIELDS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        {value.sort && (
          <div role="radiogroup" aria-label="Sort direction" className="flex rounded-lg bg-background p-1 shadow-[inset_0_0_0_1px_var(--line)]">
            {(["asc", "desc"] as const).map((dir, i) => (
              <button
                key={dir}
                type="button"
                role="radio"
                aria-checked={value.dir === dir}
                onClick={() => onChange({ ...value, dir })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  value.dir === dir ? "bg-ink text-on-ink" : "text-muted hover:text-foreground"
                }`}
              >
                {words[i]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      {visible.length > 0 && (
        <ul className="mt-5 grid gap-2.5 border-t border-line pt-5" aria-label="Your filters">
          {value.filters.map((f, i) => {
            const field = fieldByKey(f.key);
            return field && !isHidden(f.key) ? (
              <FilterRow key={f.key} field={field} filter={f} country={country} onChange={(next) => setFilter(i, next)} onRemove={() => removeFilter(i)} />
            ) : null;
          })}
        </ul>
      )}

      <div className={visible.length > 0 ? "mt-4" : "mt-5 border-t border-line pt-5"}>
        <label htmlFor={`${id}-add`} className="sr-only">
          Add a filter
        </label>
        <select
          id={`${id}-add`}
          value=""
          onChange={(e) => addFilter(e.target.value)}
          className={`${control} w-full font-semibold sm:w-auto`}
        >
          <option value="">+ Add a filter</option>
          {FIELDS.filter((f) => !used.has(f.key) && !isHidden(f.key)).map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

function FilterRow({
  field,
  filter,
  country,
  onChange,
  onRemove,
}: {
  field: Field;
  filter: CustomFilter;
  country: Country;
  onChange: (next: CustomFilter) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const set = (value: string) => onChange({ ...filter, value });

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-background px-3 py-2.5 sm:flex-nowrap">
      <span id={`${id}-label`} className="w-full shrink-0 text-sm font-semibold sm:w-44">
        {field.label}
      </span>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {field.kind === "number" && <NumberRange field={field} value={filter.value} onChange={set} labelledBy={`${id}-label`} unit={unitOf(field, country)} />}

        {field.kind === "choice" && (
          <select aria-labelledby={`${id}-label`} value={filter.value} onChange={(e) => set(e.target.value)} className={`${control} min-w-0 flex-1 sm:flex-none`}>
            {field.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        {field.kind === "bool" && (
          <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex gap-1.5">
            {(["yes", "no"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={filter.value === v}
                onClick={() => set(v)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                  filter.value === v ? "bg-ink text-on-ink" : "bg-card shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--foreground)]"
                }`}
              >
                {v === "yes" ? "Yes" : "No"}
              </button>
            ))}
          </div>
        )}

        {field.kind === "text" && (
          <input
            type="search"
            aria-labelledby={`${id}-label`}
            value={filter.value}
            onChange={(e) => set(e.target.value)}
            placeholder="e.g. Long Range"
            className={`${control} min-w-0 flex-1`}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${field.label} filter`}
        className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-accent-soft hover:text-foreground"
      >
        <svg viewBox="0 0 16 16" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </li>
  );
}

/** Min and max inputs; either may be left empty. Stored as "min~max". */
function NumberRange({ field, value, onChange, labelledBy, unit }: { field: Field & { kind: "number" }; value: string; onChange: (v: string) => void; labelledBy: string; unit: string }) {
  const [lo = "", hi = ""] = value.split("~");
  const input = (side: "min" | "max", v: string) => (
    <label className="flex min-w-0 flex-1 items-center gap-1.5 sm:flex-none">
      <span className="sr-only" id={`${labelledBy}-${side}`}>
        {side === "min" ? "Minimum" : "Maximum"}
      </span>
      {field.prefix && <span className="text-sm text-muted">{unit}</span>}
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={field.step}
        value={v}
        placeholder={side === "min" ? "Min" : "Max"}
        aria-labelledby={`${labelledBy} ${labelledBy}-${side}`}
        onChange={(e) => onChange(side === "min" ? `${e.target.value}~${hi}` : `${lo}~${e.target.value}`)}
        className={`${control} w-full min-w-0 tabular-nums sm:w-28`}
      />
      {!field.prefix && <span className="text-sm text-muted">{unit}</span>}
    </label>
  );
  return (
    <>
      {input("min", lo)}
      <span aria-hidden className="text-muted">
        to
      </span>
      {input("max", hi)}
    </>
  );
}
