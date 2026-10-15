"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import CarImage from "@/components/CarImage";
import { saveReturnTo } from "@/components/CarLink";
import CountrySwitch from "@/components/CountrySwitch";
import { carHref, type Car } from "@/lib/cars";
import { homeCountry } from "@/lib/carProfile";
import { compareHref, compareTable, MAX_COMPARE, searchCars, slotsFromParam, statusText, yearsText, type Cell } from "@/lib/compare";
import { COUNTRY_IDS, type Country } from "@/lib/market";
import { photoSubject } from "@/lib/photo";

/** The columns of the slots and the table: a label column on wider screens, then one per car. */
const COLS = "grid grid-cols-3 gap-x-2 sm:grid-cols-[11rem_repeat(3,minmax(0,1fr))] sm:gap-x-3 lg:grid-cols-[13rem_repeat(3,minmax(0,1fr))]";

/** A small Wikimedia thumbnail (120px wide) for the search list and the pinned header. */
const smallPhoto = (src: string) => src.replace("/960px-", "/120px-");

/**
 * Compare up to three cars side by side. The cars (and the country, when it isn't the UK) live in the URL, so a
 * comparison can be shared or bookmarked: /compare?cars=kia-ev6-…,tesla-model-3-…
 */
export default function Compare() {
  const router = useRouter();
  const params = useSearchParams();
  const [slots, setSlots] = useState<(Car | null)[]>(() => slotsFromParam(params.get("cars")));
  const [country, setCountry] = useState<Country>(() => {
    const p = params.get("country");
    if (p && (COUNTRY_IDS as string[]).includes(p)) return p as Country;
    const first = slotsFromParam(params.get("cars")).find(Boolean);
    return (first && homeCountry(first)) || "uk";
  });

  useEffect(() => {
    const href = compareHref(slots.map((c) => c?.slug ?? null), country);
    const now = `/compare${params.toString() ? `?${params.toString().replace(/%2C/g, ",")}` : ""}`;
    if (href !== now) router.replace(href, { scroll: false });
  }, [slots, country]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSlot = (i: number, car: Car | null) => setSlots((s) => s.map((c, j) => (j === i ? car : c)));
  const chosen = slots.filter((c): c is Car => c !== null);
  const table = useMemo(() => compareTable(slots, country), [slots, country]);
  const exclude = useMemo(() => new Set(chosen.map((c) => c.id)), [chosen]);

  return (
    <div className="mx-auto max-w-5xl">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden>/</span> <span className="text-foreground">Compare</span>
      </nav>
      <h1 className="font-wide mt-3 text-3xl font-semibold leading-tight text-balance sm:text-4xl">Compare electric cars</h1>
      <p className="mt-2 max-w-[60ch] text-muted text-pretty">
        Put up to three cars side by side. Green marks the best in each row; if cars tie, they are all green.
      </p>
      <CountrySwitch value={country} onChange={setCountry} className="mt-4" />

      {/* ---------- The three slots ---------- */}
      <div className={`mt-6 ${COLS}`}>
        <div className="hidden text-sm text-muted sm:block">
          <p className="font-semibold text-foreground">Your cars</p>
          <p className="mt-1.5 text-pretty">Search by make or model, for example &ldquo;Ioniq 5&rdquo; or &ldquo;Model Y&rdquo;.</p>
          <p className="mt-3 flex items-center gap-2">
            <span className="inline-block h-4 w-6 rounded bg-win shadow-[inset_0_0_0_1px_var(--route)]" aria-hidden /> Best in the row
          </p>
        </div>
        {slots.map((car, i) => (
          <Slot
            key={i}
            index={i}
            car={car}
            wins={chosen.length > 1 && car ? { n: table.tally.wins[i], of: table.tally.of } : null}
            exclude={exclude}
            onPick={(c) => setSlot(i, c)}
            onRemove={() => setSlot(i, null)}
          />
        ))}
      </div>

      {/* ---------- The comparison ---------- */}
      {chosen.length === 0 ? (
        <p className="mt-10 rounded-2xl bg-card p-6 text-center text-muted shadow-[0_0_0_1px_var(--line)]">
          Add a car to start. You can compare any electric car since 2011: on sale now, no longer sold new, or coming soon.
        </p>
      ) : (
        <section aria-label="Comparison" className="mt-8">
          {chosen.length === 1 && (
            <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm">Add another car to see which one wins each row.</p>
          )}

          {/* Car names stay pinned at the top while the rows scroll past. */}
          <div className={`sticky top-0 z-20 -mx-4 border-b border-line bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0 ${COLS}`}>
            <span className="hidden sm:block" />
            {slots.map((car, i) => (
              <div key={i} className="flex min-w-0 items-center gap-2">
                {car ? (
                  <>
                    {car.image && (
                      <img src={smallPhoto(car.image)} alt="" width={48} height={32} referrerPolicy="no-referrer" className="hidden h-8 w-12 shrink-0 rounded object-cover sm:block" />
                    )}
                    <span className="line-clamp-2 min-w-0 text-[11px] font-semibold leading-tight sm:text-xs">
                      {car.make} {car.model}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-muted sm:text-xs">Empty</span>
                )}
              </div>
            ))}
          </div>

          {table.groups.map((g) => (
            <div key={g.title} className="mt-6">
              <h2 className="font-wide text-lg font-semibold">{g.title}</h2>
              <dl className="mt-2">
                {g.rows.map((r) => (
                  <div key={r.key} className={`${COLS} border-t border-line py-1.5 sm:py-2`}>
                    <dt className="col-span-3 pt-1 text-xs font-medium text-muted sm:col-span-1 sm:pt-1.5 sm:text-sm">{r.label}</dt>
                    {r.cells.map((cell, i) => (
                      <Value key={i} cell={cell} win={r.wins[i]} />
                    ))}
                  </div>
                ))}
              </dl>
            </div>
          ))}

          <div className="mt-8 grid gap-2 text-xs text-muted">
            <p>
              Range is a real-world estimate, not the official WLTP figure. Used prices and &ldquo;range today&rdquo; are our estimates
              for the oldest model year, from the price when new, typical depreciation and 2% battery wear a year.
            </p>
            <p>
              Photos:{" "}
              {chosen
                .filter((c) => c.imageCredit)
                .map((c, i) => (
                  <span key={c.id}>
                    {i > 0 && "; "}
                    {photoSubject(c.imageCredit!)} by{" "}
                    <a href={c.imageCredit!.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                      {c.imageCredit!.author}
                    </a>{" "}
                    (
                    <a href={c.imageCredit!.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline underline-offset-2">
                      {c.imageCredit!.license}
                    </a>
                    )
                  </span>
                ))}
              , Wikimedia Commons.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function Value({ cell, win }: { cell: Cell | null; win: boolean }) {
  if (!cell) return <dd aria-hidden />;
  return (
    <dd
      className={`min-w-0 rounded-md px-1.5 py-1 sm:px-2 ${win ? "bg-win shadow-[inset_0_0_0_1px_var(--route)]" : ""}`}
    >
      <span className="flex items-start gap-1 text-[13px] font-semibold leading-snug tabular-nums break-words sm:text-[15px]">
        {win && (
          <span aria-hidden className="text-route">
            ✓
          </span>
        )}
        <span className="min-w-0">{cell.text}</span>
        {win && <span className="sr-only"> (best)</span>}
      </span>
      {cell.sub && <span className="block text-[11px] leading-snug text-muted sm:text-xs">{cell.sub}</span>}
    </dd>
  );
}

function Slot({
  index,
  car,
  wins,
  exclude,
  onPick,
  onRemove,
}: {
  index: number;
  car: Car | null;
  wins: { n: number; of: number } | null;
  exclude: ReadonlySet<number>;
  onPick: (car: Car) => void;
  onRemove: () => void;
}) {
  const [changing, setChanging] = useState(false);

  if (car && !changing) {
    return (
      <div className="flex min-w-0 flex-col">
        <CarImage
          src={car.image}
          credit={car.imageCredit}
          make={car.make}
          model={car.model}
          caption={false}
          frameClass="aspect-[16/10] rounded-xl shadow-[0_0_0_1px_var(--line)]"
          sizes="(min-width: 640px) 260px, 33vw"
        />
        <p className="mt-2 text-[11px] font-medium text-muted sm:text-xs">{car.make}</p>
        <Link
          href={carHref(car)}
          onClick={() => saveReturnTo("the comparison")}
          className="line-clamp-3 text-sm font-semibold leading-tight hover:underline sm:text-base"
        >
          {car.model}
        </Link>
        <p className="mt-0.5 text-[11px] text-muted sm:text-xs">
          {yearsText(car)} · {statusText(car)}
        </p>
        {wins && (
          <p className="mt-1.5 self-start rounded-full bg-win px-2 py-0.5 text-[11px] font-semibold text-foreground sm:text-xs">
            Wins {wins.n} of {wins.of}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold sm:text-sm">
          <button type="button" onClick={() => setChanging(true)} className="underline decoration-line underline-offset-4 hover:decoration-foreground">
            Change
          </button>
          <button type="button" onClick={onRemove} className="text-muted underline decoration-line underline-offset-4 hover:text-foreground">
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <CarSearch
      index={index}
      exclude={exclude}
      autoFocus={changing}
      onPick={(c) => {
        setChanging(false);
        onPick(c);
      }}
      onCancel={changing ? () => setChanging(false) : undefined}
    />
  );
}

/** Type-ahead search over every car. */
function CarSearch({
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
