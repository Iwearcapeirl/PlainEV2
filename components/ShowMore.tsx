"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The rest of a ranking after the first cards: hidden until asked for, then `step` more at a time. The cards are
 * rendered on the server and passed in, but only the revealed ones reach the page, so long rankings stay light.
 * After each click, focus moves to the first new card so keyboard and screen-reader users carry on from there.
 */
export default function ShowMore({
  items,
  start,
  total,
  step = 10,
  noun = "cars",
}: {
  /** Cards for ranks `start` onwards, in order. */
  items: ReactNode[];
  /** The rank of the first item (the list numbering continues from the cards above). */
  start: number;
  /** How many the whole ranking has (may be more than are ever listed). */
  total: number;
  step?: number;
  noun?: string;
}) {
  const [shown, setShown] = useState(0);
  const firstNew = useRef<HTMLLIElement>(null);
  const [focusFrom, setFocusFrom] = useState<number | null>(null);

  useEffect(() => {
    if (focusFrom !== null) firstNew.current?.focus();
  }, [focusFrom]);

  if (items.length === 0) return null;
  const listed = start - 1 + shown;
  const max = start - 1 + items.length;
  const next = Math.min(step, items.length - shown);

  return (
    <>
      {shown > 0 && (
        <ol start={start} className="mt-4 grid gap-4">
          {items.slice(0, shown).map((item, i) => (
            <li key={i} ref={i === focusFrom ? firstNew : undefined} tabIndex={i === focusFrom ? -1 : undefined} className="outline-none">
              {item}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {next > 0 && (
          <button
            type="button"
            onClick={() => {
              setFocusFrom(shown);
              setShown(shown + next);
            }}
            className="rounded-xl bg-card px-5 py-3 text-sm font-semibold shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--foreground)]"
          >
            Show {next} more
          </button>
        )}
        <p className="text-sm text-muted" aria-live="polite">
          {listed < max || max < total ? `Showing the top ${listed} of ${total} ${noun}` : `Showing all ${total} ${noun}`}
        </p>
      </div>
    </>
  );
}
