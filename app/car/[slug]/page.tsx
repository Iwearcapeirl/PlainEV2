import type { Metadata } from "next";
import { plainDeep } from "@/lib/units";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import CarBreadcrumb from "@/components/CarBreadcrumb";
import CarImage from "@/components/CarImage";
import EvdbLink from "@/components/EvdbLink";
import { u } from "@/components/UnitText";
import QuizCta from "@/components/QuizCta";
import RangeBar from "@/components/RangeBar";
import JsonLd from "@/components/JsonLd";
import RunningCosts from "@/components/RunningCosts";
import { breadcrumbLd } from "@/lib/jsonld";
import { runningHref } from "@/lib/running";
import { carExtras } from "@/lib/carExtras";
import { isIndexable } from "@/lib/indexing";
import { pct, wltpShare } from "@/lib/wltp";
import { WLTP_HREF } from "@/lib/site";
import { allCars, carHref, type Car, type ImageCredit } from "@/lib/cars";
import { compareHref } from "@/lib/compare";
import { modelHref, modelOf, rangeSpan } from "@/lib/models";
import { vsPagesFor, vsTitle } from "@/lib/rivals";
import { formatBattery, formatTerm, TRANSFER_LABEL, usedWarrantyLeft, WARRANTY_CHECKED, warrantyOf } from "@/lib/warranty";
import { photoSubject } from "@/lib/photo";
import {
  bodyLabel,
  bodyPlural,
  carStandings,
  carSummary,
  CHEMISTRY_LABEL,
  driveLabel,
  getCarBySlug,
  homeCountry,
  segmentLabel,
  similarCars,
  type Standing,
} from "@/lib/carProfile";
import {
  formatAccel,
  formatDistance,
  formatEfficiency,
  formatGbp,
  formatGbpPerKm,
  formatGbpPerMile,
  formatKm,
  formatMi,
  formatMiles,
  formatMiPerKwh,
  formatSize,
  formatWhPerKm,
} from "@/lib/format";
import {
  BATTERY_LOSS_PER_YEAR,
  COUNTRIES,
  formatMoney,
  formatBand,
  listingSearch,
  newPrice,
  usedEstimates,
  usedFrom,
  type Country,
} from "@/lib/market";
import { SITE_NAME, SITE_URL, UPDATED_ISO, UPDATED_LABEL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// One static page per car; any other /car/* URL is a 404.
// Only the cars on sale new in the UK are built with each deployment, to keep deployments small (Vercel's free plan
// caps the storage they use). Every other car's page (no longer sold new, coming soon, or sold only in Germany or the
// Netherlands) is built the first time someone opens it, then saved and served like the rest until the next
// deployment. Unknown addresses still get a 404 (notFound below).
export const dynamicParams = true;

export function generateStaticParams() {
  return allCars.filter((c) => c.status === "Available" && c.priceGbp !== null).map((c) => ({ slug: c.slug }));
}

const countryName = (c: Country) => (c === "uk" ? "the UK" : c === "nl" ? "the Netherlands" : COUNTRIES[c].label);

/** "On sale new", "No longer sold new · 2019–2022", "Coming soon" */
function statusLabel(car: Car): string {
  if (car.status === "Upcoming") return "Coming soon";
  if (car.status === "Discontinued") {
    const years = car.yearTo && car.yearTo !== car.yearFrom ? `${car.yearFrom}–${car.yearTo}` : `${car.yearFrom}`;
    return `No longer sold new · sold ${years}`;
  }
  return car.priceGbp !== null ? "On sale new" : `On sale new in ${[car.priceDeEur !== null && "Germany", car.priceNlEur !== null && "the Netherlands"].filter(Boolean).join(" and ")}`;
}

// Titles and descriptions are shown by search engines and share previews, which can't switch units: always miles.
export async function generateMetadata(props: Props): Promise<Metadata> {
  return plainDeep(await metadataFor(props));
}

async function metadataFor({ params }: Props): Promise<Metadata> {
  const car = getCarBySlug((await params).slug);
  if (!car) return {};
  const name = `${car.make} ${car.model}`;
  const country = homeCountry(car);
  const price = country ? newPrice(car, country) : null;
  const used = country ? usedFrom(car, country) : null;
  const title =
    car.status === "Available" && car.priceGbp !== null
      ? `${name}: real-world range, specs and UK price`
      : `${name}: real-world range, specs and used prices`;
  const pricing =
    car.status === "Available" && price !== null && country
      ? `from ${formatMoney(price, country)} in ${countryName(country)}`
      : used && country
        ? `used roughly ${formatBand(used.low, used.high, country)} (estimated)`
        : car.status === "Upcoming"
          ? "coming soon"
          : "";
  const description =
    `${name}: ${formatDistance(car.rangeKm)} real-world range (not WLTP), ${formatEfficiency(car.whPerKm)}, ` +
    `${car.fastchargeKw} kW average rapid charging${pricing ? `, ${pricing}` : ""}.`;
  return {
    title,
    description,
    alternates: { canonical: carHref(car) },
    // Older model years of the same version, and cars not sold in the UK, stay reachable but out of search (lib/indexing.ts).
    ...(isIndexable(car) ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, type: "article", images: [{ url: `/api/og/car/${car.slug}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function CarPage({ params }: Props) {
  const car = getCarBySlug((await params).slug);
  if (!car) notFound();

  const name = `${car.make} ${car.model}`;
  const { interiors } = carExtras(car.id);
  // Every photo of the car, for stepping through in the full-screen viewer.
  const gallery = [
    ...(car.image ? [{ src: car.image, credit: car.imageCredit, alt: car.imageCredit ? `${photoSubject(car.imageCredit)}, exterior` : `${car.make} ${car.model}` }] : []),
    ...interiors.map((p, i) => ({ src: p.image, credit: p as ImageCredit, alt: `Interior of the ${p.subject}${i ? ", second view" : ""}` })),
  ];
  const country = homeCountry(car);
  const price = country ? newPrice(car, country) : null;
  const usedTable = country ? usedEstimates(car, country) : [];
  const cheapestUsed = usedTable.length ? usedTable[usedTable.length - 1] : null;
  // Everything except coming-soon cars (nothing to buy yet) gets a search on a listings site, new and used.
  const listing = country && car.status !== "Upcoming" ? listingSearch(car, country) : null;
  // Live listings for one model year, next to each estimated used price (only when the search is for this model).
  const liveFor = (year: number) => {
    if (!country) return null;
    const l = listingSearch(car, country, { from: year, to: year });
    return l.exact ? l.url : null;
  };
  const standings = carStandings(car);
  const summary = carSummary(car);
  const model = modelOf(car.family);
  const similar = similarCars(car);
  const rivals = vsPagesFor(car.family);

  return (
    <article className="mx-auto max-w-5xl">
      <JsonLd
        data={[
          jsonLd(car),
          breadcrumbLd([
            { name: "Home", path: "/" },
            model ? { name: model.name, path: modelHref(model) } : { name: "Rankings", path: "/best" },
            { name, path: carHref(car) },
          ]),
        ]}
      />

      <CarBreadcrumb current={name} model={model ? { href: modelHref(model), label: model.name } : undefined} />

      {/* ---------- Hero: photo + key facts ---------- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <CarImage
          src={car.image}
          credit={car.imageCredit}
          make={car.make}
          model={car.model}
          priority
          alt={car.imageCredit ? `${photoSubject(car.imageCredit)}, exterior` : undefined}
          gallery={gallery}
          frameClass="aspect-[16/10] rounded-2xl shadow-[0_0_0_1px_var(--line)]"
          sizes="(min-width: 1024px) 620px, 100vw"
        />

        <header className="rounded-2xl bg-card p-5 shadow-[0_0_0_1px_var(--line),0_24px_48px_-32px_rgb(14_26_43/0.35)] sm:p-6">
          <p className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-muted">
            <span>{car.make}</span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                car.status === "Available" ? "bg-ink text-on-ink" : car.status === "Upcoming" ? "bg-accent-soft text-foreground" : "bg-signal text-signal-ink"
              }`}
            >
              {statusLabel(car)}
            </span>
          </p>
          <h1 className="font-wide mt-1 text-[1.75rem] font-semibold leading-[1.1] text-balance sm:text-3xl">{car.model}</h1>
          {car.fullName !== name && <p className="mt-1.5 text-sm text-muted">{car.fullName}</p>}
          {model && (
            <p className="mt-1.5 text-sm">
              <Link href={modelHref(model)} className="font-semibold underline decoration-signal decoration-2 underline-offset-4">
                See all {model.versions.length} versions of the {model.name}
              </Link>
            </p>
          )}

          {country && price !== null && (
            <div className="mt-4 grid gap-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm text-muted">{car.status === "Available" ? "From" : car.status === "Upcoming" ? "Expected" : "Was"}</span>
                <span className="font-wide text-2xl font-semibold tabular-nums">{formatMoney(price, country)}</span>
                <span className="text-sm text-muted">
                  {car.status === "Discontinued" ? `new, ${countryName(country)}` : `${countryName(country)} price`}
                </span>
              </p>
              {cheapestUsed && (
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm text-muted">Used</span>
                  <span className="font-wide text-xl font-semibold tabular-nums">{formatBand(cheapestUsed.low, cheapestUsed.high, country)}</span>
                  <span className="text-sm text-muted">estimated, {cheapestUsed.year} car</span>
                  {liveFor(cheapestUsed.year) && (
                    <a href={liveFor(cheapestUsed.year)!} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline decoration-signal decoration-2 underline-offset-4">
                      Live prices ↗
                    </a>
                  )}
                </p>
              )}
            </div>
          )}

          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="At a glance">
            {[
              bodyLabel(car.body),
              driveLabel(car.drive),
              `${car.seats} seats`,
              car.heatPump && "Heat pump",
              car.v2l && "V2L",
              car.chemistry && `${car.chemistry} battery`,
            ]
              .filter(Boolean)
              .map((t) => (
                <li key={t as string} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-foreground/80">
                  {t}
                </li>
              ))}
          </ul>

          <div className="mt-6 border-t border-line pt-5">
            <RangeBar rangeKm={car.rangeKm} oneStopKm={car.oneStopKm} size="lg" />
            <p className="mt-2 text-xs text-muted">
              {car.wltpKm ? (
                <>
                  Real-world estimate for mixed driving in average weather. The official WLTP figure is {u(formatMiles(car.wltpKm))}, so
                  expect about {pct(wltpShare(car)!)} of the advertised range: more around town, less on the motorway or in winter.{" "}
                  <Link href={`${WLTP_HREF}#real-world`} className="underline decoration-line underline-offset-2 hover:text-foreground">
                    What real-world means
                  </Link>
                </>
              ) : (
                <>Real-world estimate. Makers&rsquo; advertised (WLTP) ranges are usually 20–30% higher.</>
              )}
            </p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line">
            <Tile label="Efficiency" value={formatMiPerKwh(car.whPerKm)} sub={formatWhPerKm(car.whPerKm)} />
            <Tile label="1-stop range" value={formatMi(car.oneStopKm)} sub={formatKm(car.oneStopKm)} />
            <Tile label="Rapid charging" value={`${car.fastchargeKw} kW`} sub="average, 10–80%" />
            {car.status === "Available" && car.priceGbp !== null ? (
              <Tile label="Price per mile" value={formatGbpPerMile(car.priceGbp, car.rangeKm)} sub={`${formatGbpPerKm(car.priceGbp, car.rangeKm)}/km of range`} />
            ) : (
              <Tile label="0–62 mph" value={formatAccel(car.accelS)} sub="0–100 km/h" />
            )}
          </dl>
          <p className="mt-2.5 text-xs text-muted">
            Figures from{" "}
            <EvdbLink car={car} className="font-medium text-foreground underline decoration-line underline-offset-2 hover:decoration-foreground">
              EV Database: full specs for this car
            </EvdbLink>
          </p>

          {listing && (
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-1.5 rounded-xl bg-signal px-4 py-3 text-center text-sm font-semibold text-signal-ink hover:brightness-95"
            >
              {listing.label} <span aria-hidden>↗</span>
            </a>
          )}
          <Link
            href={compareHref([car.slug], country)}
            className={`${listing ? "mt-2.5" : "mt-5"} flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-center text-sm font-semibold shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--foreground)]`}
          >
            Compare with up to 2 others <span aria-hidden>→</span>
          </Link>
        </header>
      </div>

      {/* ---------- Interior ---------- */}
      {interiors.length > 0 && (
        <section aria-labelledby="inside-title" className="mt-12">
          <SectionTitle id="inside-title">Inside</SectionTitle>
          <div className={`mt-4 grid gap-3 ${interiors.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {interiors.map((p, i) => (
              <CarImage
                  key={p.image}
                  src={p.image}
                  credit={p}
                  make={car.make}
                  model={car.model}
                  alt={`Interior of the ${p.subject}${i ? ", second view" : ""}`}
                  gallery={gallery}
                  frameClass={`rounded-2xl shadow-[0_0_0_1px_var(--line)] ${interiors.length > 1 ? "aspect-[4/3]" : "aspect-[16/9]"}`}
                  sizes={interiors.length > 1 ? "(min-width: 640px) 500px, 100vw" : "(min-width: 1024px) 960px, 100vw"}
                />
            ))}
          </div>
          {interiors.some((p) => p.subject !== car.family) && (
            <p className="mt-2 text-xs text-muted">
              {interiors.length > 1 ? "Photos show" : "Photo shows"} the {interiors.find((p) => p.subject !== car.family)!.subject}, which
              shares this cabin. Trim and screens can differ by version and market.
            </p>
          )}
        </section>
      )}

      {/* ---------- Used prices (estimated) ---------- */}
      {country && usedTable.length > 0 && (
        <section aria-labelledby="used-title" className="mt-12">
          <SectionTitle id="used-title">Buying one used</SectionTitle>
          <p className="mt-2 max-w-[66ch] text-muted text-pretty">
            Likely asking prices by model year{country !== "uk" ? ` in ${countryName(country)}` : ""} for an average-mileage example,
            estimated from its price when new and checked against real UK listings (most cars are advertised within the band), with the real-world range you can expect today
            after about {Math.round(BATTERY_LOSS_PER_YEAR * 100)}% battery wear a year. They&rsquo;re estimates, not valuations: mileage,
            trim, condition and battery health make a big difference, so check real listings before you budget.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--line)]">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-accent-soft text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Model year</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Likely price (est.)</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium sm:px-5">Range today (est.)</th>
                </tr>
              </thead>
              <tbody>
                {usedTable.map((e) => (
                  <tr key={e.year} className="border-t border-line">
                    <th scope="row" className="px-4 py-2.5 text-left font-semibold sm:px-5">{e.year}</th>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold">{formatBand(e.low, e.high, country)}</span>
                      {liveFor(e.year) && (
                        <a href={liveFor(e.year)!} target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold underline decoration-signal underline-offset-2 sm:inline sm:pl-2">
                          live prices ↗
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right sm:px-5">{u(formatMiles(e.rangeTodayKm))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {listing && (
            <p className="mt-3 text-sm">
              <a href={listing.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-signal decoration-2 underline-offset-4">
                Check real prices on {listing.site} ↗
              </a>
            </p>
          )}
        </section>
      )}

      {/* ---------- Running costs ---------- */}
      <section aria-labelledby="running-title" className="mt-12">
        <SectionTitle id="running-title">Running costs</SectionTitle>
        <p className="mt-2 max-w-[66ch] text-muted text-pretty">
          What it costs to charge, from its real-world efficiency, compared with a petrol car. UK prices, which you can change to match your
          mileage and tariff.
        </p>
        <RunningCosts whPerKm={car.whPerKm} name={car.model} calculatorHref={runningHref([car.slug])} />
      </section>

      {/* ---------- Warranty ---------- */}
      <WarrantySection car={car} usedYears={usedTable.map((e) => e.year)} country={country} />

      {/* ---------- Summary + how it compares ---------- */}
      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <section aria-labelledby="summary-title">
          <SectionTitle id="summary-title">Summary</SectionTitle>
          <div className="mt-4 grid max-w-[66ch] gap-4 text-[17px] leading-relaxed text-pretty">
            {summary.map((p) => (
              <p key={p.slice(0, 32)}>{u(p)}</p>
            ))}
          </div>
          <p className="mt-5 max-w-[66ch] border-l-4 border-signal pl-3 text-sm text-muted">
            Written by {SITE_NAME} from the figures on this page. Range is a real-world estimate, not the official WLTP
            figure.
          </p>
        </section>

        <aside aria-labelledby="compare-title">
          <SectionTitle id="compare-title">How it compares</SectionTitle>
          <ul className="mt-4 grid gap-2.5">
            <Rank label="Real-world range" s={standings.range} scope="of all EVs on sale" />
            {standings.rangeInBody.of > 0 && (
              <Rank label="Range among" extra={bodyPlural(car.body)} s={standings.rangeInBody} scope={`of ${standings.rangeInBody.of} ${bodyPlural(car.body)}`} />
            )}
            <Rank label="Efficiency" s={standings.efficiency} scope="of all EVs on sale" />
            <Rank label="Rapid-charging speed" s={standings.charging} scope="of all EVs on sale" />
          </ul>
          <p className="mt-2.5 text-xs text-muted">Compared with the EVs on sale new in the UK today.</p>
        </aside>
      </div>

      <AdSlot slot="car-mid" className="mt-12" />

      {/* ---------- Full specs ---------- */}
      <section aria-labelledby="specs-title" className="mt-12">
        <SectionTitle id="specs-title">Specifications</SectionTitle>
        <p className="mt-2 text-sm text-muted">
          Source:{" "}
          <EvdbLink car={car} className="underline decoration-line underline-offset-2 hover:text-foreground hover:decoration-foreground">
            {car.make} {car.model} on EV Database
          </EvdbLink>
        </p>
        {/* Every column in the data. Figures marked "estimate" aren't confirmed by the maker yet. */}
        <div className="mt-4 gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
          <SpecGroup
            title="Range and efficiency"
            rows={[
              ["Real-world range", est(formatDistance(car.rangeKm), car.rangeEstimated)],
              ["Efficiency", est(formatEfficiency(car.whPerKm), car.efficiencyEstimated)],
              ["Range with one 15-min stop", formatDistance(car.oneStopKm)],
              ["Official WLTP range", car.wltpKm ? `${formatDistance(car.wltpKm)} (real-world is ${pct(wltpShare(car)!)} of it)` : "Not listed"],
            ]}
          />
          <SpecGroup
            title="Charging"
            rows={[
              ["Rapid charging (10–80% average)", `${car.fastchargeKw} kW`],
              ["AC charging (home or destination)", `${car.acChargeKw} kW`],
              ["Charging plug", car.chargePlug],
              ["Vehicle-to-load (V2L)", yesNo(car.v2l)],
              ["Vehicle-to-home (V2H)", yesNo(car.v2h)],
              ["Vehicle-to-grid (V2G)", yesNo(car.v2g)],
            ]}
          />
          <SpecGroup
            title="Battery"
            rows={[
              ["Usable battery", est(`${car.batteryKwh} kWh`, car.batteryEstimated)],
              ["Battery chemistry", car.chemistry ? (CHEMISTRY_LABEL[car.chemistry] ?? car.chemistry) : "Not listed"],
              ["Heat pump", yesNo(car.heatPump)],
            ]}
          />
          <SpecGroup
            title="Body and performance"
            rows={[
              ["Body style", bodyLabel(car.body)],
              ["Size class", segmentLabel(car.segment)],
              ["Seats", String(car.seats)],
              ["Drive", driveLabel(car.drive)],
              ["0–62 mph (0–100 km/h)", formatAccel(car.accelS)],
              ["Weight", `${car.weightKg.toLocaleString("en-GB")} kg`],
            ]}
          />
          <SpecGroup
            title="Size"
            rows={[
              ["Length", size(car.lengthMm)],
              ["Width (without mirrors)", size(car.widthMm)],
              ["Width with mirrors", size(car.widthMirrorsMm)],
              ["Height", size(car.heightMm)],
              ["Wheelbase", size(car.wheelbaseMm)],
            ]}
          />
          <SpecGroup
            title="Practicality and safety"
            rows={[
              ["Boot space", `${car.cargoL.toLocaleString("en-GB")} litres`],
              ["Towbar available", yesNo(car.towbar)],
              ["Towing capacity (braked)", car.towingKg > 0 ? `${car.towingKg.toLocaleString("en-GB")} kg` : "Not approved for towing"],
              ["Euro NCAP rating", car.ncapStars !== null ? `${car.ncapStars} stars` : "Not yet tested"],
              ["Max payload (people and luggage)", car.payloadKg !== null ? `${car.payloadKg.toLocaleString("en-GB")} kg` : "Not listed"],
            ]}
          />
          <SpecGroup
            title="Price and availability"
            rows={[
              [car.status === "Available" ? "UK starting price" : "UK price when new", car.priceGbp !== null ? formatGbp(car.priceGbp) : "Not sold in the UK"],
              ...(car.priceGbp !== null
                ? [["UK price per mile of range", `${formatGbpPerMile(car.priceGbp, car.rangeKm)} (${formatGbpPerKm(car.priceGbp, car.rangeKm)}/km)`] as [string, string]]
                : []),
              ["Price per km of range (EUR)", est(`€${car.pricePerKmEur}`, car.pricePerKmEstimated)],
              ["Price in Germany", car.priceDeEur !== null ? euro(car.priceDeEur) : "Not listed"],
              ["Price in the Netherlands", car.priceNlEur !== null ? euro(car.priceNlEur) : "Not listed"],
              ["Availability", car.availability],
              [car.status === "Upcoming" ? "Expected on sale" : "On sale new", `${monthYear(car.availableFrom)}${car.availableTo ? ` to ${monthYear(car.availableTo)}` : " onwards"}`],
              ["Model years", car.yearTo ? `${car.yearFrom} to ${car.yearTo}` : `${car.yearFrom} onwards`],
              ["Status", statusLabel(car)],
            ]}
          />
        </div>
      </section>

      {/* ---------- About the figures + photo credits ---------- */}
      <section aria-labelledby="source-title" className="mt-12 rounded-2xl bg-ink p-6 text-on-ink sm:p-8">
        <h2 id="source-title" className="font-wide text-xl font-semibold">About the figures</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-3 text-sm leading-relaxed text-on-ink/80">
            <p>
              Specifications, range and efficiency figures come from{" "}
              <EvdbLink car={car} className="underline decoration-on-ink/30 underline-offset-2 hover:text-on-ink">
                EV Database
              </EvdbLink>
              , extracted on{" "}
              <time dateTime={UPDATED_ISO}>{formatDate(UPDATED_ISO)}</time>. Range is a real-world estimate, not the official
              WLTP figure. UK prices are starting prices including VAT.
            </p>
            <p>The summary above is written by {SITE_NAME} from those figures.</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Photos</p>
            <ul className="mt-2 grid gap-2 text-on-ink/85">
              {[car.imageCredit && { ...car.imageCredit, what: "Exterior" }, ...interiors.map((p) => ({ ...p, what: "Interior" }))]
                .filter((c): c is ImageCredit & { what: string } => Boolean(c))
                .map((c) => (
                  <li key={c.source}>
                    {c.what}: {photoSubject(c)}, by{" "}
                    <a href={c.source} target="_blank" rel="noopener noreferrer" className="underline decoration-on-ink/30 underline-offset-2 hover:text-on-ink">
                      {c.author}
                    </a>{" "}
                    (
                    <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline decoration-on-ink/30 underline-offset-2 hover:text-on-ink">
                      {c.license}
                    </a>
                    ), Wikimedia Commons
                  </li>
                ))}
              {!car.imageCredit && interiors.length === 0 && <li>No freely licensed photos of this model yet.</li>}
            </ul>
            <p className="mt-3 text-xs text-on-ink/85">Photos show the model, not always the exact version or year.</p>
          </div>
        </div>
        <p className="mt-6 text-xs text-on-ink/85">Updated {UPDATED_LABEL}</p>
      </section>

      {/* ---------- Other versions: on the model page ---------- */}
      {model && (
        <section aria-labelledby="versions-title" className="mt-12">
          <SectionTitle id="versions-title">Other versions of the {car.family}</SectionTitle>
          <Link
            href={modelHref(model)}
            className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-card px-5 py-4 shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1.5px_var(--foreground)]"
          >
            <span className="min-w-0">
              <span className="block font-semibold">All {model.versions.length} versions of the {model.name}, side by side</span>
              <span className="block text-sm text-muted">Real-world range {u(rangeSpan(model))}, prices and used values by year</span>
            </span>
            <span aria-hidden className="text-lg">→</span>
          </Link>
        </section>
      )}

      <AdSlot slot="car-bottom" className="mt-12" />

      {/* ---------- Head-to-head pages with its rivals ---------- */}
      {rivals.length > 0 && (
        <section aria-labelledby="rivals-title" className="mt-12">
          <SectionTitle id="rivals-title">Compare with rivals</SectionTitle>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {rivals.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/vs/${p.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3.5 text-[15px] font-semibold shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1.5px_var(--foreground)]"
                >
                  {vsTitle(p)} <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Alternatives ---------- */}
      {similar.length > 0 && (
        <section aria-labelledby="similar-title" className="mt-12">
          <SectionTitle id="similar-title">Similar {bodyPlural(car.body)} at this price</SectionTitle>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {similar.map((s) => (
              <li
                key={s.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--line)] transition-shadow hover:shadow-[0_0_0_1.5px_var(--foreground)] has-[a:focus-visible]:shadow-[0_0_0_2px_var(--foreground)]"
              >
                <CarImage src={s.image} credit={s.imageCredit} make={s.make} model={s.model} frameClass="aspect-[16/10]" sizes="(min-width: 640px) 300px, 100vw" />
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-xs text-muted">{s.make}</p>
                  <h3 className="font-semibold leading-snug">
                    <Link
                      href={carHref(s)}
                      className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:underline group-hover:decoration-signal group-hover:decoration-2 group-hover:underline-offset-4"
                    >
                      <span className="sr-only">{s.make} </span>
                      {s.model}
                    </Link>
                  </h3>
                  <p className="mt-auto flex items-baseline justify-between gap-2 pt-3 text-sm tabular-nums">
                    <span className="font-semibold">{u(formatMi(s.rangeKm))} <span className="font-normal text-muted">range</span></span>
                    <span className="text-muted">{formatGbp(s.priceGbp)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-12">
        <QuizCta />
      </div>
    </article>
  );
}

// ---------- Pieces ----------

/**
 * The maker's UK warranty (data/warranty.json): car, battery, whether it passes to the next owner, and for used cars
 * an estimate of what's likely left, based on today's terms.
 */
function WarrantySection({ car, usedYears, country }: { car: Car; usedYears: number[]; country: Country | null }) {
  const w = warrantyOf(car);
  const checked = formatDate(WARRANTY_CHECKED);
  // Newest and oldest used model years (the table is newest first).
  const years = [...new Set([usedYears[0], usedYears[usedYears.length - 1]].filter((y): y is number => y !== undefined))];
  return (
    <section aria-labelledby="warranty-title" className="mt-12">
      <SectionTitle id="warranty-title">Warranty</SectionTitle>
      {!w ? (
        <p className="mt-3 max-w-[66ch] text-muted text-pretty">
          We haven&rsquo;t been able to confirm {car.make}&rsquo;s UK warranty from an official source yet. Ask the seller or a {car.make} dealer.
        </p>
      ) : w.closed ? (
        <p className="mt-3 max-w-[66ch] text-pretty">{w.closed}</p>
      ) : (
        <>
          <dl className="mt-4 grid gap-px overflow-hidden rounded-2xl bg-line shadow-[0_0_0_1px_var(--line)] sm:grid-cols-3">
            <WarrantyItem label="Car warranty" value={w.car ? formatTerm(w.car) : "Not confirmed"} note={w.carNote} />
            <WarrantyItem label="Battery warranty" value={w.battery ? formatBattery(w.battery) : "Not confirmed"} note={w.batteryNote} />
            <WarrantyItem label="Passes to the next owner" value={TRANSFER_LABEL[w.transfer]} note={w.transferNote} />
          </dl>
          {car.status !== "Upcoming" && years.length > 0 && (
            <ul className="mt-4 grid max-w-[66ch] gap-1.5 text-[15px] text-pretty">
              {years.map((y) => {
                const left = usedWarrantyLeft(w, y);
                const miles = (t?: { miles: number | "unlimited" | null }) => (t && typeof t.miles === "number" ? ` if under ${t.miles.toLocaleString("en-GB")} miles` : "");
                const parts = [
                  w.battery?.years != null && (left.battery ? `battery warranty likely runs to ${left.battery}${miles(w.battery)}` : "battery warranty has likely ended"),
                  w.car?.years != null && (left.car ? `car warranty likely runs to ${left.car}${miles(w.car)}` : "car warranty has likely ended"),
                ].filter(Boolean);
                return parts.length ? (
                  <li key={y}>
                    <span className="font-semibold">A {y} car:</span> {parts.join("; ")}.
                  </li>
                ) : null;
              })}
            </ul>
          )}
          <p className="mt-3 max-w-[66ch] text-xs text-muted text-pretty">
            {w.source ? (
              <>
                From{" "}
                <a href={w.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                  {w.sourceLabel}
                </a>
                , checked {checked}.{" "}
              </>
            ) : null}
            Today&rsquo;s UK terms{country && country !== "uk" ? " (they can differ in Germany and the Netherlands)" : ""}. Older cars may have had
            different terms and conditions such as servicing apply, so check the service history and what&rsquo;s left with the seller.
          </p>
        </>
      )}
    </section>
  );
}

function WarrantyItem({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-card p-4 sm:p-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-pretty">{value}</dd>
      {note && <dd className="mt-1 text-xs text-muted text-pretty">{note}</dd>}
    </div>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-wide text-xl font-semibold sm:text-2xl">
      {children}
    </h2>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-card px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{u(value)}</dd>
      <dd className="text-[11px] tabular-nums text-muted">{u(sub)}</dd>
    </div>
  );
}

function Rank({ label, extra, s, scope }: { label: string; extra?: string; s: Standing; scope: string }) {
  const share = 1 - (s.rank - 1) / s.of; // 1 = best
  return (
    <li className="rounded-xl bg-card px-4 py-3 shadow-[0_0_0_1px_var(--line)]">
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted">
          {label}
          {extra && <> {u(extra)}</>}
        </span>
        <span className="tabular-nums">
          <span className="font-wide text-lg font-semibold">{s.rank}</span>
          <span className="text-sm text-muted"> / {s.of}</span>
        </span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-signal" style={{ width: `${Math.max(3, share * 100).toFixed(1)}%` }} />
      </div>
      <p className="sr-only">
        Ranked {s.rank} {scope}
      </p>
    </li>
  );
}

/** "4.64 m (15 ft 2 in)", or "Not listed". */
const size = (mm: number | null) => (mm !== null ? formatSize(mm) : "Not listed");

function SpecGroup({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-[0_0_0_1px_var(--line)]">
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="mt-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-t border-line py-2.5 first:border-t-0">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="text-right text-sm font-medium tabular-nums">{u(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const yesNo = (v: boolean) => (v ? "Yes" : "No");
const est = (value: string, estimated: boolean) => (estimated ? `${value} (estimate)` : value);
const euro = (n: number) => `€${n.toLocaleString("en-GB")}`;
const monthYear = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** schema.org Car, so search engines can show price and specs. */
function jsonLd(car: Car) {
  const q = (value: number, unitCode: string, unitText?: string) => ({ "@type": "QuantitativeValue", value, unitCode, ...(unitText ? { unitText } : {}) });
  const prop = (name: string, value: number, unitCode: string, unitText: string) => ({ "@type": "PropertyValue", name, value, unitCode, unitText });
  return {
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${car.make} ${car.model}`,
    brand: { "@type": "Brand", name: car.make },
    model: car.model,
    url: `${SITE_URL}${carHref(car)}`,
    image: car.image ?? undefined,
    bodyType: bodyLabel(car.body),
    driveWheelConfiguration: driveLabel(car.drive),
    seatingCapacity: car.seats,
    fuelType: "Electricity",
    vehicleModelDate: String(car.yearFrom),
    accelerationTime: q(car.accelS, "SEC", "0–100 km/h"),
    ...(car.cargoL > 0 ? { cargoVolume: q(car.cargoL, "LTR") } : {}),
    ...(car.weightKg > 0 ? { weight: q(car.weightKg, "KGM") } : {}),
    // Real-world energy use, in the units of the "Efficiency" figure on the page.
    fuelConsumption: { "@type": "QuantitativeValue", value: Math.round(car.whPerKm) / 10, unitText: "kWh/100 km" },
    additionalProperty: [
      prop("Real-world range", Math.round(car.rangeKm), "KMT", "km"),
      prop("Usable battery capacity", car.batteryKwh, "KWH", "kWh"),
      prop("Average rapid-charging power (10–80%)", car.fastchargeKw, "KWT", "kW"),
    ],
    // Only cars on sale new in the UK have a price to offer.
    offers:
      car.status === "Available" && car.priceGbp !== null
        ? { "@type": "Offer", price: car.priceGbp, priceCurrency: "GBP", availability: "https://schema.org/InStock", url: `${SITE_URL}${carHref(car)}` }
        : undefined,
  };
}
