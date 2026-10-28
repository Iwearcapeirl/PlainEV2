"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Car } from "@/lib/cars";
import { MAX_COMPARE, searchCars, statusText, yearsText } from "@/lib/compare";

/** A small Wikimedia thumbnail (120px wide) for search lists and pinned headers. */
export const smallPhoto = (src: string) => src.replace("/960px-", "/120px-");

/** Type-ahead search over every car. */
export default function CarSearch({
  index,
  exclude,
  autoFocus,
  onPick,
  onCancel,
}: {
  index: number;
  exclude: ReadonlySet<number>;
  autoFocus: boolean;
  onPick: (car: Car) => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { results, total } = useMemo(() => searchCars(q, exclude), [q, exclude]);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  const pick = (c: Car) => {
    setQ("");
    setOpen(false);
    onPick(c);
  };
  const showList = open && q.trim().length > 0;
  // The list is wider than a column on phones, so it lines up with the slot's own side of the screen.
  const align = index === 0 ? "left-0" : index === MAX_COMPARE - 1 ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <div className="relative flex min-w-0 flex-col">
      <button
        type="button"
        tabIndex={-1}
        onClick={() => input.current?.focus()}
        className="flex aspect-[16/10] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-muted hover:border-foreground/40 hover:text-foreground"
      >
        <span aria-hidden className="text-2xl leading-none">+</span>
        <span className="text-xs font-medium sm:text-sm">{onCancel ? "Change car" : `Add car ${index + 1}`}</span>
      </button>
      <label htmlFor={`${id}-q`} className="sr-only">
        {onCancel ? "Search for a different car" : `Search for car ${index + 1}`}
      </label>
      <input
        ref={input}
        id={`${id}-q`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${id}-o${active}` : undefined}
        autoComplete="off"
        placeholder="Search…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && showList && results[active]) {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === "Escape") {
            if (q) setQ("");
            else onCancel?.();
          }
        }}
        className="mt-2 w-full min-w-0 rounded-lg bg-card px-2.5 py-2 text-[16px] text-foreground shadow-[inset_0_0_0_1px_var(--line)] focus:shadow-[inset_0_0_0_2px_var(--ink)] focus:outline-none sm:text-[15px]"
      />
      {onCancel && (
        <button type="button" onClick={onCancel} className="mt-1.5 self-start text-xs font-semibold text-muted underline underline-offset-4 hover:text-foreground sm:text-sm">
          Cancel
        </button>
      )}

      {showList && (
        <div
          className={`absolute top-full z-30 mt-1 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--line),0_18px_40px_-12px_rgb(14_26_43/0.35)] ${align}`}
        >
          <ul id={`${id}-list`} role="listbox" aria-label="Matching cars" className="max-h-80 overflow-y-auto py-1">
            {results.map((c, i) => (
              <li
                key={c.id}
                id={`${id}-o${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? "bg-accent-soft" : ""}`}
              >
                {c.image ? (
                  <img src={smallPhoto(c.image)} alt="" width={56} height={36} loading="lazy" referrerPolicy="no-referrer" className="h-9 w-14 shrink-0 rounded object-cover" />
                ) : (
                  <span className="h-9 w-14 shrink-0 rounded bg-accent-soft" aria-hidden />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {c.make} {c.model}
                  </span>
                  <span className="block text-xs text-muted">
                    {yearsText(c)} · {statusText(c)}
                  </span>
                </span>
              </li>
            ))}
            {results.length === 0 && <li className="px-3 py-3 text-sm text-muted">No cars match &ldquo;{q.trim()}&rdquo;.</li>}
          </ul>
          {total > results.length && (
            <p className="border-t border-line px-3 py-2 text-xs text-muted">
              Showing {results.length} of {total}. Keep typing to narrow it down, e.g. add &ldquo;long range&rdquo; or a year.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
