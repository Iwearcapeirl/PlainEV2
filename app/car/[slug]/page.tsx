import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import CarBreadcrumb from "@/components/CarBreadcrumb";
import CarImage from "@/components/CarImage";
import QuizCta from "@/components/QuizCta";
import RangeBar from "@/components/RangeBar";
import { carHref, cars, type Car, type ImageCredit } from "@/lib/cars";
import {
  bodyLabel,
  bodyPlural,
  carStandings,
  carSummary,
  CHEMISTRY_LABEL,
  driveLabel,
  getCarBySlug,
  otherVersions,
  similarCars,
  type Standing,
} from "@/lib/carProfile";
import {
  formatDistance,
  formatEfficiency,
  formatGbp,
  formatGbpPerKm,
  formatGbpPerMile,
  formatKm,
  formatMi,
  formatMiPerKwh,
  formatWhPerKm,
} from "@/lib/format";
import { SITE_NAME, SITE_URL, UPDATED_ISO, UPDATED_LABEL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// One static page per car; any other /car/* URL is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return cars.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const car = getCarBySlug((await params).slug);
  if (!car) return {};
  const name = `${car.make} ${car.model}`;
  const title = `${name}: real-world range, specs and UK price`;
  const description =
    `${name}: ${formatDistance(car.rangeKm)} real-world range (not WLTP), ${formatEfficiency(car.whPerKm)}, ` +
    `${car.fastchargeKw} kW average rapid charging, from ${formatGbp(car.priceGbp)} in the UK.`;
  return {
    title,
    description,
    alternates: { canonical: carHref(car) },
    openGraph: { title, description, type: "article", images: car.image ? [{ url: car.image }] : undefined },
  };
}

export default async function CarPage({ params }: Props) {
  const car = getCarBySlug((await params).slug);
  if (!car) notFound();

  const name = `${car.make} ${car.model}`;
  const standings = carStandings(car);
  const summary = carSummary(car);
  const versions = otherVersions(car);
  const similar = similarCars(car);

  return (
    <article className="mx-auto max-w-5xl">
      <script
        type="application/ld+json"
        // Structured data for search engines; built from our own data, so it is safe to inline.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(car)).replace(/</g, "\\u003c") }}
      />

      <CarBreadcrumb current={name} />

      {/* ---------- Hero: photo + key facts ---------- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <CarImage
          src={car.image}
          credit={car.imageCredit}
          make={car.make}
          model={car.model}
          priority
          alt={car.imageCredit ? `${car.imageCredit.subject}, exterior` : undefined}
          frameClass="aspect-[16/10] rounded-2xl shadow-[0_0_0_1px_var(--line)] lg:aspect-auto lg:h-full lg:min-h-[26rem]"
          sizes="(min-width: 1024px) 620px, 100vw"
        />

        <header className="rounded-2xl bg-card p-5 shadow-[0_0_0_1px_var(--line),0_24px_48px_-32px_rgb(14_26_43/0.35)] sm:p-6">
          <p className="text-sm font-medium text-muted">{car.make}</p>
          <h1 className="font-wide mt-1 text-[1.75rem] font-semibold leading-[1.1] text-balance sm:text-3xl">{car.model}</h1>
          {car.fullName !== name && <p className="mt-1.5 text-sm text-muted">{car.fullName}</p>}

          <p className="mt-4 flex items-baseline gap-2">
            <span className="text-sm text-muted">From</span>
            <span className="font-wide text-2xl font-semibold tabular-nums">{formatGbp(car.priceGbp)}</span>
            <span className="text-sm text-muted">UK price</span>
          </p>

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
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line">
            <Tile label="Efficiency" value={formatMiPerKwh(car.whPerKm)} sub={formatWhPerKm(car.whPerKm)} />
            <Tile label="1-stop range" value={formatMi(car.oneStopKm)} sub={formatKm(car.oneStopKm)} />
            <Tile label="Rapid charging" value={`${car.fastchargeKw} kW`} sub="average, 10–80%" />
            <Tile label="Price per mile" value={formatGbpPerMile(car.priceGbp, car.rangeKm)} sub={`${formatGbpPerKm(car.priceGbp, car.rangeKm)}/km of range`} />
          </dl>

          <a
            href={car.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-on-ink hover:bg-ink/90"
          >
            Full data on EV Database <span aria-hidden>↗</span>
          </a>
        </header>
      </div>

      {/* ---------- Interior ---------- */}
      {car.interiors.length > 0 && (
        <section aria-labelledby="inside-title" className="mt-12">
          <SectionTitle id="inside-title">Inside</SectionTitle>
          <div className={`mt-4 grid gap-3 ${car.interiors.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {car.interiors.map((p, i) => (
              <CarImage
                  key={p.image}
                  src={p.image}
                  credit={p}
                  make={car.make}
                  model={car.model}
                  alt={`Interior of the ${p.subject}${i ? ", second view" : ""}`}
                  frameClass={`rounded-2xl shadow-[0_0_0_1px_var(--line)] ${car.interiors.length > 1 ? "aspect-[4/3]" : "aspect-[16/9]"}`}
                  sizes={car.interiors.length > 1 ? "(min-width: 640px) 500px, 100vw" : "(min-width: 1024px) 960px, 100vw"}
                />
            ))}
          </div>
          {car.interiors.some((p) => p.subject !== car.family) && (
            <p className="mt-2 text-xs text-muted">
              {car.interiors.length > 1 ? "Photos show" : "Photo shows"} the {car.interiors.find((p) => p.subject !== car.family)!.subject}, which
              shares this cabin. Trim and screens can differ by version and market.
            </p>
          )}
        </section>
      )}

      {/* ---------- Summary + how it compares ---------- */}
      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <section aria-labelledby="summary-title">
          <SectionTitle id="summary-title">Summary</SectionTitle>
          <div className="mt-4 grid max-w-[66ch] gap-4 text-[17px] leading-relaxed text-pretty">
            {summary.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
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
            <Rank label="Range among" extra={bodyPlural(car.body)} s={standings.rangeInBody} scope={`of ${standings.rangeInBody.of} ${bodyPlural(car.body)}`} />
            <Rank label="Efficiency" s={standings.efficiency} scope="of all EVs on sale" />
            <Rank label="Rapid-charging speed" s={standings.charging} scope="of all EVs on sale" />
          </ul>
        </aside>
      </div>

      <AdSlot slot="car-mid" className="mt-12" />

      {/* ---------- Full specs ---------- */}
      <section aria-labelledby="specs-title" className="mt-12">
        <SectionTitle id="specs-title">Specifications</SectionTitle>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SpecGroup
            title="Range and charging"
            rows={[
              ["Real-world range", formatDistance(car.rangeKm)],
              ["Efficiency", formatEfficiency(car.whPerKm)],
              ["Range with one 15-min stop", formatDistance(car.oneStopKm)],
              ["Rapid charging (10–80% average)", `${car.fastchargeKw} kW`],
            ]}
          />
          <SpecGroup
            title="Battery and features"
            rows={[
              ["Usable battery", `${car.batteryKwh} kWh`],
              ["Battery chemistry", car.chemistry ? (CHEMISTRY_LABEL[car.chemistry] ?? car.chemistry) : "Not listed"],
              ["Heat pump", car.heatPump ? "Yes" : "No"],
              ["Vehicle-to-load (V2L)", car.v2l ? "Yes" : "No"],
            ]}
          />
          <SpecGroup
            title="Body and practicality"
            rows={[
              ["Body style", bodyLabel(car.body)],
              ["Seats", String(car.seats)],
              ["Drive", driveLabel(car.drive)],
            ]}
          />
          <SpecGroup
            title="Price"
            rows={[
              ["UK starting price", formatGbp(car.priceGbp)],
              ["UK price per mile of range", `${formatGbpPerMile(car.priceGbp, car.rangeKm)} (${formatGbpPerKm(car.priceGbp, car.rangeKm)}/km)`],
              ["Price per km of range (EUR)", `€${car.pricePerKmEur}`],
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
              Specifications, range and efficiency figures were extracted on{" "}
              <time dateTime={UPDATED_ISO}>{formatDate(UPDATED_ISO)}</time>. Range is a real-world estimate, not the official
              WLTP figure. UK prices are starting prices including VAT.
            </p>
            <p>The summary above is written by {SITE_NAME} from those figures.</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold">Photos</p>
            <ul className="mt-2 grid gap-2 text-on-ink/75">
              {[car.imageCredit && { ...car.imageCredit, what: "Exterior" }, ...car.interiors.map((p) => ({ ...p, what: "Interior" }))]
                .filter((c): c is ImageCredit & { what: string } => Boolean(c))
                .map((c) => (
                  <li key={c.source}>
                    {c.what}: {c.subject}, by{" "}
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
              {!car.imageCredit && car.interiors.length === 0 && <li>No freely licensed photos of this model yet.</li>}
            </ul>
            <p className="mt-3 text-xs text-on-ink/55">Photos show the model, not always the exact version or year.</p>
          </div>
        </div>
        <p className="mt-6 text-xs text-on-ink/55">Updated {UPDATED_LABEL}</p>
      </section>

      {/* ---------- Other versions ---------- */}
      {versions.length > 0 && (
        <section aria-labelledby="versions-title" className="mt-12">
          <SectionTitle id="versions-title">Other versions of the {car.family}</SectionTitle>
          <ul className="mt-4 overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--line)]">
            {versions.map((v) => (
              <li key={v.id} className="border-t border-line first:border-t-0">
                <Link href={carHref(v)} className="group flex items-center gap-4 px-4 py-3.5 hover:bg-accent-soft sm:px-5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium group-hover:underline group-hover:decoration-signal group-hover:decoration-2 group-hover:underline-offset-4">
                      {v.model}
                    </span>
                    <span className="block text-xs text-muted">
                      {driveLabel(v.drive)} · {v.batteryKwh} kWh · {formatMiPerKwh(v.whPerKm)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block font-semibold">{formatMi(v.rangeKm)}</span>
                    <span className="block text-xs text-muted">{formatGbp(v.priceGbp)}</span>
                  </span>
                  <span aria-hidden className="text-muted transition-transform group-hover:translate-x-0.5">→</span>
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
                    <span className="font-semibold">{formatMi(s.rangeKm)} <span className="font-normal text-muted">range</span></span>
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
      <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{value}</dd>
      <dd className="text-[11px] tabular-nums text-muted">{sub}</dd>
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
          {extra && ` ${extra}`}
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

function SpecGroup({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-[0_0_0_1px_var(--line)]">
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="mt-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 border-t border-line py-2.5 first:border-t-0">
            <dt className="text-sm text-muted">{k}</dt>
            <dd className="text-right text-sm font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** schema.org Car, so search engines can show price and specs. */
function jsonLd(car: Car) {
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
    offers: { "@type": "Offer", price: car.priceGbp, priceCurrency: "GBP", availability: "https://schema.org/InStock" },
  };
}
