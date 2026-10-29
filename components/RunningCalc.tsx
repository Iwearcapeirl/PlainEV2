"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CarImage from "@/components/CarImage";
import CarSearch from "@/components/CarSearch";
import { saveReturnTo } from "@/components/CarLink";
import { Assumptions, useRunningInputs } from "@/components/RunningCosts";
import { u } from "@/components/UnitText";
import { carHref, type Car } from "@/lib/cars";
import { slotsFromParam, statusText, yearsText } from "@/lib/compare";
import { EVED, formatPencePerMile, formatPounds, runningCost, runningHref } from "@/lib/running";

/** Up to three cars' charging costs side by side, against the petrol car, with the shared assumptions above. */
export default function RunningCalc() {
  const router = useRouter();
  const params = useSearchParams();
  const [slots, setSlots] = useState<(Car | null)[]>(() => slotsFromParam(params.get("cars")));
  const [inputs, setInputs] = useRunningInputs();

  useEffect(() => {
    const href = runningHref(slots.map((c) => c?.slug ?? null));
    const now = `/running-costs${params.toString() ? `?${params.toString().replace(/%2C/g, ",")}` : ""}`;
    if (href !== now) router.replace(href, { scroll: false });
  }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps

  const exclude = useMemo(() => new Set(slots.filter((c): c is Car => c !== null).map((c) => c.id)), [slots]);
  const setSlot = (i: number, car: Car | null) => setSlots((s) => s.map((c, j) => (j === i ? car : c)));
  const petrol = runningCost(0, inputs);
  const costs = slots.map((c) => (c ? runningCost(c.whPerKm, inputs) : null));
  // Each car with the planned per-mile charge, for the small "from April 2028" line when it isn't in the main figures.
  const in2028 = slots.map((c) => (c ? runningCost(c.whPerKm, { ...inputs, eved: 1 }) : null));
  const cheapest = Math.min(...costs.filter((c) => c !== null).map((c) => c!.perMile));
  const several = costs.filter(Boolean).length > 1;

  return (
    <div>
      <Assumptions startOpen />

      <div className="mt-4 rounded-2xl bg-accent-soft p-4 sm:p-5">
        <label className="flex items-start gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={Boolean(inputs.eved)}
            onChange={(e) => setInputs({ eved: e.target.checked ? 1 : 0 })}
            className="mt-0.5 size-5 shrink-0 accent-[var(--ink)]"
          />
          <span>
            Include the {EVED.pencePerMile}p-a-mile charge for electric cars from {EVED.from}
            <span className="mt-1 block text-xs font-normal text-muted text-pretty">
              The government plans to charge electric cars {EVED.pencePerMile}p a mile on top of road tax from {EVED.from}, rising with inflation from
              2029. It isn&rsquo;t law yet.{" "}
              <a href={EVED.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                Details on GOV.UK
              </a>
            </span>
          </span>
        </label>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Cars">
        {slots.map((car, i) => {
          const c = costs[i];
          return (
            <li key={i} className="flex min-w-0 flex-col rounded-2xl bg-card p-3 shadow-[0_0_0_1px_var(--line)] sm:p-4">
              {car && c ? (
                <>
                  <CarImage
                    src={car.image}
                    credit={car.imageCredit}
                    make={car.make}
                    model={car.model}
                    caption={false}
                    frameClass="aspect-[16/10] rounded-xl"
                    sizes="(min-width: 640px) 300px, 100vw"
                  />
                  <p className="mt-2 text-xs font-medium text-muted">{car.make}</p>
                  <Link href={carHref(car)} onClick={() => saveReturnTo("the running costs")} className="font-semibold leading-tight hover:underline">
                    {car.model}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {yearsText(car)} · {statusText(car)}
                  </p>
                  <dl className="mt-3 grid gap-2 border-t border-line pt-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted">{inputs.eved ? `Running cost from ${EVED.from}` : "Charging cost"}</dt>
                      <dd className="font-wide text-xl font-semibold tabular-nums">
                        {formatPounds(c.perMonth)} <span className="text-sm font-normal text-muted">a month</span>
                      </dd>
                      <dd className="text-xs tabular-nums text-muted">
                        {u(formatPencePerMile(c.perMile))} · {formatPounds(c.perYear)} a year
                      </dd>
                      {!inputs.eved && in2028[i] && (
                        <dd className="text-xs tabular-nums text-muted">
                          From {EVED.from}: {formatPounds(in2028[i]!.perMonth)} a month with the {EVED.pencePerMile}p-a-mile charge
                        </dd>
                      )}
                      {several && c.perMile === cheapest && (
                        <dd className="mt-1 inline-block rounded-full bg-win px-2 py-0.5 text-xs font-semibold">Cheapest to run</dd>
                      )}
                    </div>
                    <div>
                      <dt className="text-xs text-muted">{c.savingPerYear >= 0 ? "Saving against petrol" : "More than petrol"}</dt>
                      <dd className="font-semibold tabular-nums">{formatPounds(Math.abs(c.savingPerYear))} a year</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Home only / rapid only</dt>
                      <dd className="tabular-nums">
                        {u(formatPencePerMile(c.homeOnly, false))} / {u(formatPencePerMile(c.rapidOnly, false))}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => setSlot(i, null)}
                    className="mt-3 self-start text-xs font-semibold text-muted underline decoration-line underline-offset-4 hover:text-foreground"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <CarSearch index={i} exclude={exclude} autoFocus={false} onPick={(picked) => setSlot(i, picked)} />
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-pretty">
        The petrol car ({inputs.mpg} mpg at {inputs.petrolP}p a litre) costs{" "}
        <span className="font-semibold tabular-nums">{formatPounds(petrol.petrolPerYear / 12)} a month</span> ({u(formatPencePerMile(petrol.petrolPerMile))}).
      </p>
    </div>
  );
}
