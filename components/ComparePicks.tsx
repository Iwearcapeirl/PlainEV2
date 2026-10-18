"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { allCars, type Car } from "@/lib/cars";
import { compareHref, MAX_COMPARE } from "@/lib/compare";
import type { Country } from "@/lib/market";

/**
 * "Compare" tick boxes on list pages (All cars, quiz results) and the bar pinned to the bottom of the screen that
 * collects up to three picked cars. Picks are kept for the browser tab (sessionStorage), across lists and country
 * switches, so a visitor can pick one car from All cars and two from their results.
 */

const KEY = "plainev:compare-picks";
const listeners = new Set<() => void>();
const BY_SLUG = new Map(allCars.map((c) => [c.slug, c]));
const EMPTY: string[] = [];
let cache: { raw: string | null; picks: string[] } = { raw: null, picks: EMPTY };

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    // Storage blocked: picks just last for this page view (kept in `memory`).
    return memory;
  }
  if (raw === cache.raw) return cache.picks;
  let picks: string[] = EMPTY;
  try {
    const v = JSON.parse(raw ?? "[]");
    if (Array.isArray(v)) picks = v.filter((s): s is string => typeof s === "string" && BY_SLUG.has(s)).slice(0, MAX_COMPARE);
  } catch {}
  cache = { raw, picks };
  return picks;
}
let memory: string[] = EMPTY;

function write(picks: string[]) {
  memory = picks;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(picks));
  } catch {}
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => e.key === KEY && l();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
};

/** The picked cars' slugs, in the order they were picked. Empty on the server and before hydration. */
export function useComparePicks(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** A "Compare" tick box for one car. Sits above a card's stretched link so it stays clickable. */
export function CompareTick({ car, tone = "light", className = "" }: { car: Car; tone?: "light" | "dark"; className?: string }) {
  const picks = useComparePicks();
  const [full, setFull] = useState(false);
  const checked = picks.includes(car.slug);
  useEffect(() => {
    if (!full) return;
    const t = setTimeout(() => setFull(false), 2500);
    return () => clearTimeout(t);
  }, [full]);

  const toggle = () => {
    if (checked) write(picks.filter((s) => s !== car.slug));
    else if (picks.length >= MAX_COMPARE) setFull(true);
    else write([...picks, car.slug]);
  };

  return (
    <label
      className={`relative z-10 inline-flex cursor-pointer select-none items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-semibold ${
        tone === "dark" ? "text-on-ink/85 hover:text-on-ink" : "text-muted hover:text-foreground"
      } ${className}`}
    >
      <input type="checkbox" checked={checked} onChange={toggle} className="size-4 accent-[var(--ink)]" />
      Compare
      {full && (
        <span role="status" className="absolute left-0 top-full z-20 mt-1 w-max rounded-md bg-deep px-2 py-1 text-[11px] font-medium text-on-ink shadow-lg">
          You can compare up to {MAX_COMPARE} cars
        </span>
      )}
    </label>
  );
}

/** The bar pinned to the bottom of the screen while any car is picked, plus a spacer so it never hides the last row. */
export function CompareBar({ country }: { country: Country }) {
  const picks = useComparePicks();
  if (picks.length === 0) return null;
  const cars = picks.map((s) => BY_SLUG.get(s)!).filter(Boolean);
  const ready = cars.length >= 2;

  return (
    <>
      <div aria-hidden className="h-28 sm:h-24" />
      <div
        role="region"
        aria-label="Cars to compare"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 px-4 py-3 shadow-[0_-12px_32px_-16px_rgb(14_26_43/0.35)] backdrop-blur sm:px-6"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
          <ul className="-mx-1 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {cars.map((c) => (
              <li key={c.slug} className="flex min-w-0 max-w-[75vw] shrink-0 items-center gap-1 rounded-full sm:max-w-full sm:shrink bg-accent-soft py-1 pl-3 pr-1 text-xs font-semibold sm:text-sm">
                <span className="truncate">
                  {c.make} {c.variant}
                </span>
                <button
                  type="button"
                  onClick={() => write(picks.filter((s) => s !== c.slug))}
                  aria-label={`Remove ${c.make} ${c.variant}`}
                  className="grid size-6 shrink-0 place-items-center rounded-full text-muted hover:bg-card hover:text-foreground"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-3">
            <button type="button" onClick={() => write([])} className="text-sm font-semibold text-muted underline underline-offset-4 hover:text-foreground">
              Clear
            </button>
            {ready ? (
              <Link
                href={compareHref(picks, country)}
                className="flex-1 rounded-xl bg-signal px-5 py-2.5 text-center text-sm font-semibold text-signal-ink hover:brightness-95 sm:flex-none"
              >
                Compare {cars.length} cars →
              </Link>
            ) : (
              <span className="flex-1 rounded-xl bg-accent-soft px-5 py-2.5 text-center text-sm font-semibold text-muted sm:flex-none">
                Pick 1–2 more
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
