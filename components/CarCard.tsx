import Link from "next/link";
import CarImage from "@/components/CarImage";
import { familyHref } from "@/lib/models";
import { u } from "@/components/UnitText";
import CarLink from "@/components/CarLink";
import { CompareTick } from "@/components/ComparePicks";
import RangeBar from "@/components/RangeBar";
import { carHref, type Car } from "@/lib/cars";
import { formatAccel, formatGbp, formatGbpPerKm, formatGbpPerMile, formatKm, formatMi, formatMiles, formatMiPerKwh, formatWhPerKm } from "@/lib/format";
import { budgetFitText, formatMoney, type BudgetFit, type Country, type Offer, formatBand, listingSearch } from "@/lib/market";
import type { FilterKey } from "@/lib/quiz";
import { formatPencePerMile, formatPounds, runningCost, RUNNING_DEFAULTS } from "@/lib/running";

/** Results context: the buyer's country, what they could pay (new and/or used) and the merged version name. */
export interface CardMarket {
  country: Country;
  offer: Offer;
  /** e.g. "Model 3 Long Range AWD" (model-year tags removed) */
  title: string;
  /** e.g. "2019–2023" or "2021 on" */
  years: string;
  /** Set when only used examples are within the buyer's budget (the new price is over it). */
  budgetFit?: BudgetFit | null;
}

type Metric = "range" | "efficiency" | "value" | "acceleration" | "running" | "towing" | "onestop" | "charging";

/**
 * One ranked car. `featured` (used for number 1) stacks a large photo above the details;
 * otherwise the card is horizontal from 640px up, with the photo on the left.
 * The whole card opens the car's page: the model name is the link, stretched over the card,
 * and the photo-credit links sit above it so they stay clickable.
 */
export default function CarCard({
  car,
  rank,
  matched = [],
  metric = "range",
  headingLevel = 2,
  priority = rank === 1,
  featured = false,
  returnLabel,
  market,
}: {
  car: Car;
  /** Set on quiz and search results; ranking pages leave it out and show the UK new price. */
  market?: CardMarket;
  rank: number;
  /** Quiz filters this car meets; shown as highlighted "matches" chips. */
  matched?: { key: FilterKey; chip: string }[];
  /** The metric this list is ranked by; highlighted alongside real range. */
  metric?: Metric;
  headingLevel?: 2 | 3;
  /** Load the photo immediately instead of lazily (defaults to the number 1 car only). */
  priority?: boolean;
  /** Large layout for the top car. */
  featured?: boolean;
  /** How the car page's "Back to …" link describes this list, e.g. "your results". */
  returnLabel: string;
}) {
  // Plain spec chips, minus anything already shown as a match.
  const matchedKeys = new Set(matched.map((m) => m.key));
  const specs = (
    [
      { key: "body", label: car.body === "Station" ? "Estate" : car.body },
      { key: "drive", label: car.drive },
      { key: "seats", label: `${car.seats} seats` },
      car.heatPump && { key: "heatPump", label: "Heat pump" },
      car.v2l && { key: "v2l", label: "V2L" },
      car.chemistry && { key: "chemistry", label: `${car.chemistry} battery` },
    ].filter(Boolean) as { key: FilterKey; label: string }[]
  ).filter((s) => !matchedKeys.has(s.key));
  const Heading = headingLevel === 3 ? "h3" : "h2";

  const stats: StatProps[] = [
    {
      label: "Efficiency",
      value: formatMiPerKwh(car.whPerKm),
      sub: `(${formatWhPerKm(car.whPerKm)})`,
      strong: metric === "efficiency",
    },
    { label: "1-stop range", value: formatMi(car.oneStopKm), sub: `(${formatKm(car.oneStopKm)})`, strong: metric === "onestop" },
  ];
  if (metric === "acceleration") {
    stats.push({ label: "0–62 mph", value: formatAccel(car.accelS), sub: "(0–100 km/h)", strong: true });
  }
  if (metric === "towing") {
    stats.push({ label: "Can tow", value: `${car.towingKg.toLocaleString("en-GB")} kg`, sub: "(braked trailer)", strong: true });
  }
  if (metric === "charging") {
    stats.push({ label: "Rapid charging", value: `${car.fastchargeKw} kW`, sub: "(10–80% average)", strong: true });
  }
  if (metric === "running") {
    // At the UK-average assumptions (lib/running.ts); the car page lets people change them.
    const r = runningCost(car.whPerKm, RUNNING_DEFAULTS);
    stats.push({ label: "Charging cost", value: `${formatPounds(r.perMonth)}/month`, sub: `(${formatPencePerMile(r.perMile)})`, strong: true });
  }
  if (metric === "value" && car.priceGbp !== null) {
    stats.push({
      label: "Price per mile",
      value: formatGbpPerMile(car.priceGbp, car.rangeKm),
      sub: `(${formatGbpPerKm(car.priceGbp, car.rangeKm)}/km)`,
      strong: true,
    });
  }

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl bg-card shadow-[0_1px_0_var(--line),0_0_0_1px_var(--line)] transition-shadow hover:shadow-[0_0_0_1.5px_var(--foreground),0_18px_36px_-24px_rgb(14_26_43/0.45)] has-[a:focus-visible]:shadow-[0_0_0_2px_var(--foreground)] ${
        featured ? "" : "sm:grid sm:grid-cols-[18.5rem_minmax(0,1fr)] sm:items-start"
      }`}
    >
      <CarImage
        src={car.image}
        credit={car.imageCredit}
        make={car.make}
        model={car.model}
        priority={priority}
        frameClass={featured ? "aspect-[16/9]" : "aspect-[16/9] sm:m-3 sm:mr-0 sm:aspect-[4/3] sm:rounded-xl"}
        sizes={featured ? "(min-width: 768px) 720px, 100vw" : "(min-width: 640px) 284px, 100vw"}
      />

      <div className={featured ? "p-5 sm:p-7" : "p-4 sm:p-5 sm:pl-6"}>
        <div className="flex items-start gap-3">
          <span
            aria-label={`Rank ${rank}`}
            className={`font-wide grid shrink-0 place-items-center rounded-md bg-ink font-semibold tabular-nums text-signal ${
              featured ? "size-10 text-lg" : "size-8 text-sm"
            }`}
          >
            {rank}
          </span>
          <div className="min-w-0 flex-1">
            {familyHref(car.family) ? (
              <p className="text-sm text-muted">
                {/* Above the card's stretched link, so it opens the model page rather than this version. */}
                <Link href={familyHref(car.family)!} className="relative z-10 -my-1 inline-block py-1 hover:text-foreground hover:underline">
                  {car.family}
                </Link>
              </p>
            ) : (
              <p className="text-sm text-muted">{car.make}</p>
            )}
            <Heading className={`font-semibold leading-snug text-pretty ${featured ? "text-xl sm:text-2xl" : "text-[17px]"}`}>
              <CarLink
                href={carHref(car)}
                returnLabel={returnLabel}
                className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-signal group-hover:decoration-2 group-hover:underline-offset-4"
              >
                <span className="sr-only">{car.make} </span>
                {market ? market.title : car.model}
              </CarLink>
            </Heading>
            {market && (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                {market.offer.newPrice !== null && <span className="rounded bg-ink px-1.5 py-0.5 font-semibold text-on-ink">New</span>}
                {market.offer.used && <span className="rounded bg-signal px-1.5 py-0.5 font-semibold text-signal-ink">Used</span>}
                <span>{market.years}</span>
              </p>
            )}
            {market?.budgetFit && (
              <p className="mt-1.5 text-xs font-semibold text-route-ink">{budgetFitText(market.budgetFit, market.country)}</p>
            )}
            {/* Results only (ranking pages have no market): pick cars for the compare bar. */}
            {market && <CompareTick car={car} className="-ml-1.5 mt-1" />}
          </div>
          {market ? (
            <PriceBlock car={car} market={market} featured={featured} />
          ) : (
            car.priceGbp !== null && (
              <p className="shrink-0 text-right">
                <span className={`font-wide block font-semibold tabular-nums ${featured ? "text-xl sm:text-2xl" : "text-[17px]"}`}>
                  {formatGbp(car.priceGbp)}
                </span>
                <span className="block text-xs text-muted">from, UK</span>
              </p>
            )
          )}
        </div>

        <div className={featured ? "mt-6" : "mt-4"}>
          <RangeBar rangeKm={car.rangeKm} oneStopKm={car.oneStopKm} size={featured ? "lg" : "md"} />
          {market?.offer.used && (
            <p className="mt-2 text-xs text-muted">
              Range when new. A {market.offer.used.year} car today: about {u(formatMiles(market.offer.used.rangeTodayKm))} (estimated, after battery wear).
            </p>
          )}
        </div>

        <dl className={`mt-4 grid gap-px overflow-hidden rounded-xl bg-line ${stats.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {stats.map((s) => (
            <Stat key={s.label} {...s} />
          ))}
        </dl>

        {matched.length > 0 && (
          <div className="mt-4">
            <p id={`matches-${car.id}`} className="text-xs text-muted">
              Matches your answers
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-labelledby={`matches-${car.id}`}>
              {matched.map((m) => (
                <li key={m.key} className="rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-on-ink">
                  <span aria-hidden className="mr-1 text-signal">✓</span>
                  {u(m.chip)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <ul className="flex flex-wrap gap-1.5" aria-label="Specs">
            {specs.map((t) => (
              <li key={t.key} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-foreground/80">
                {t.label}
              </li>
            ))}
          </ul>
          <span aria-hidden className="inline-flex items-center gap-1 text-sm font-semibold">
            Specs, photos &amp; summary
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </div>
    </article>
  );
}

interface StatProps {
  label: string;
  value: string;
  sub?: string;
  strong?: boolean;
}

function Stat({ label, value, sub, strong = false }: StatProps) {
  return (
    <div className={`px-3 py-2.5 ${strong ? "bg-signal text-signal-ink" : "bg-card"}`}>
      <dt className={`text-xs ${strong ? "text-signal-ink/75" : "text-muted"}`}>{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{u(value)}</dd>
      {sub && <dd className={`text-[11px] tabular-nums ${strong ? "text-signal-ink/70" : "text-muted"}`}>{u(sub)}</dd>}
    </div>
  );
}

/** New price and/or estimated used price, in the buyer's currency. */
function PriceBlock({ car, market, featured }: { car: Car; market: CardMarket; featured: boolean }) {
  const { offer: o, country } = market;
  const big = `font-wide block font-semibold tabular-nums ${featured ? "text-xl sm:text-2xl" : "text-[17px]"}`;
  return (
    <div className="shrink-0 text-right">
      {o.newPrice !== null && (
        <p>
          <span className={market.budgetFit ? "block text-[15px] font-semibold tabular-nums text-muted" : big}>{formatMoney(o.newPrice, country)}</span>
          <span className="block text-xs text-muted">{market.budgetFit ? "new, over budget" : "new"}</span>
        </p>
      )}
      {o.used && (
        <p className={o.newPrice !== null ? "mt-1.5" : ""}>
          <span className={o.newPrice !== null && !market.budgetFit ? "block text-[15px] font-semibold tabular-nums" : big}>{formatBand(o.used.low, o.used.high, country)}</span>
          <span className="block text-xs text-muted">used, est.</span>
          <LiveLink car={car} year={o.used.year} country={country} />
        </p>
      )}
    </div>
  );
}

/** Live AutoTrader (or AutoScout24) listings for this model and year, so the estimate can be checked in one tap. */
export function LiveLink({ car, year, country, className = "text-xs" }: { car: Car; year: number; country: Country; className?: string }) {
  const l = listingSearch(car, country, { from: year, to: year });
  if (!l.exact) return null;
  return (
    <a href={l.url} target="_blank" rel="noopener noreferrer" className={`block font-semibold underline decoration-signal underline-offset-2 ${className}`}>
      Live prices ↗
    </a>
  );
}
