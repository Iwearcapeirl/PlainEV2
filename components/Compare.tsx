"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CarImage from "@/components/CarImage";
import CompareRows, { COLS } from "@/components/CompareTable";
import EvdbLink from "@/components/EvdbLink";
import { saveReturnTo } from "@/components/CarLink";
import CountrySwitch from "@/components/CountrySwitch";
import { carHref, type Car } from "@/lib/cars";
import { homeCountry } from "@/lib/carProfile";
import CarSearch, { smallPhoto } from "@/components/CarSearch";
import { compareHref, compareTable, slotsFromParam, statusText, yearsText } from "@/lib/compare";
import { COUNTRY_IDS, type Country } from "@/lib/market";
import { photoSubject } from "@/lib/photo";


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

          <CompareRows table={table} />

          <div className="mt-8 grid gap-2 text-xs text-muted">
            <p>
              Figures come from EV Database (linked under each car). Range is a real-world estimate, not the official WLTP figure. Used prices and &ldquo;range today&rdquo; are our estimates
              for the oldest model year: a typical asking price for an average-mileage car (checked against real listings) and 2% battery wear a year.
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
          link={{ href: carHref(car), returnLabel: "the comparison" }}
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
        <p className="mt-0.5 text-[11px] text-muted sm:text-xs">
          Source:{" "}
          <EvdbLink car={car} className="underline decoration-line underline-offset-2 hover:text-foreground">
            EV Database
          </EvdbLink>
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
