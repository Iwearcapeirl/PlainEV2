import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import CarImage from "@/components/CarImage";
import EvdbLink from "@/components/EvdbLink";
import ModelVersions, { type VersionTable } from "@/components/ModelVersions";
import QuizCta from "@/components/QuizCta";
import { u } from "@/components/UnitText";
import { photoSubject } from "@/lib/photo";
import { carHref, type Car } from "@/lib/cars";
import { formatEfficiency, formatMi, formatMiles, formatMiPerKwh } from "@/lib/format";
import { formatBand, formatMoney, listingSearch, newPrice, usedFrom } from "@/lib/market";
import {
  getModel,
  modelHref,
  modelPriceLabel,
  models,
  modelSummary,
  rangeSpan,
  usedByYear,
  usedFromBand,
  versionGroups,
  type Model,
} from "@/lib/models";
import { vsPagesFor, vsTitle } from "@/lib/rivals";
import { DATA_YEAR, SITE_URL, UPDATED_ISO, UPDATED_LABEL } from "@/lib/site";
import { plain, plainDeep } from "@/lib/units";
import { formatBattery, formatTerm, TRANSFER_LABEL, warrantyOf } from "@/lib/warranty";

type Props = { params: Promise<{ slug: string }> };

// Models with a version on sale new in the UK are built with each deployment; the rest on their first visit, then
// saved (as car pages are), to keep deployments small. Unknown slugs are a 404.
export const dynamicParams = true;

export function generateStaticParams() {
  return models.filter((m) => m.onSale.some((c) => c.priceGbp !== null)).map((m) => ({ slug: m.slug }));
}

// Titles and descriptions are shown by search engines and share previews, which can't switch units: always miles.
export async function generateMetadata(props: Props): Promise<Metadata> {
  return plainDeep(await metadataFor(props));
}

async function metadataFor({ params }: Props): Promise<Metadata> {
  const m = getModel((await params).slug);
  if (!m) return {};
  const title = `${m.name}: real-world range of every version, prices and used values (${DATA_YEAR})`;
  const price = modelPriceLabel(m);
  const used = usedFromBand(m);
  const description =
    `Real-world range of all ${m.versions.length} ${m.name} versions: ${rangeSpan(m)}, not WLTP.` +
    (price ? ` New from ${price.split("–")[0]}.` : "") +
    (used && m.country ? ` Used roughly ${formatBand(used.low, used.high, m.country)} for a ${used.year} car.` : "") +
    " Side by side, with rivals and warranty.";
  return {
    title,
    description,
    alternates: { canonical: modelHref(m) },
    openGraph: { title, description, type: "article", images: [{ url: `/api/og/car/${m.lead.slug}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ModelPage({ params }: Props) {
  const m = getModel((await params).slug);
  if (!m) notFound();
  const country = m.country;
  const prices = modelPriceLabel(m);
  const usedBand = usedFromBand(m);
  const byYear = usedByYear(m);
  const rivals = vsPagesFor(m.name);
  const w = warrantyOf(m.lead);
  const live = (from: number, to: number) => {
    if (!country) return null;
    const l = listingSearch(m.lead, country, { from, to });
    return l.exact ? l.url : null;
  };
  const tables: VersionTable[] = versionGroups(m).map((g) => ({ title: g.title, rows: g.versions.map((c) => row(c, country)) }));
  const oldest = byYear.length ? byYear[byYear.length - 1].year : null;
  const newest = byYear.length ? byYear[0].year : null;

  return (
    <article className="mx-auto max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(m)).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/models" className="hover:text-foreground">Models A–Z</Link></li>
          <li aria-hidden className="max-sm:hidden">/</li>
          <li aria-current="page" className="text-foreground max-sm:sr-only">{m.name}</li>
        </ol>
      </nav>

      {/* ---------- Hero ---------- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <CarImage
          src={m.lead.image}
          credit={m.lead.imageCredit}
          make={m.lead.make}
          model={m.lead.model}
          priority
          alt={m.lead.imageCredit ? `${photoSubject(m.lead.imageCredit)}, exterior` : undefined}
          frameClass="aspect-[16/10] rounded-2xl shadow-[0_0_0_1px_var(--line)]"
          sizes="(min-width: 1024px) 620px, 100vw"
        />
        <header className="rounded-2xl bg-card p-5 shadow-[0_0_0_1px_var(--line),0_24px_48px_-32px_rgb(14_26_43/0.35)] sm:p-6">
          <p className="text-sm font-medium text-muted">{m.make}</p>
          <h1 className="font-wide mt-1 text-[1.75rem] font-semibold leading-[1.1] text-balance sm:text-3xl">
            {m.name.startsWith(m.make + " ") ? m.name.slice(m.make.length + 1) : m.name}
            <span className="sr-only"> real-world range, every version</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {m.versions.length} versions · {m.onSale.length ? `${m.onSale.length} on sale new` : "no longer sold new"}
          </p>

          <dl className="mt-5 grid gap-3">
            <div>
              <dt className="text-sm text-muted">Real-world range</dt>
              <dd className="font-wide text-2xl font-semibold tabular-nums">{u(rangeSpan(m))}</dd>
            </div>
            {prices && country && (
              <div>
                <dt className="text-sm text-muted">New{country !== "uk" ? ` (${country === "de" ? "Germany" : "Netherlands"})` : ""}</dt>
                <dd className="font-wide text-xl font-semibold tabular-nums">{prices}</dd>
              </div>
            )}
            {usedBand && country && (
              <div>
                <dt className="text-sm text-muted">Used, estimated</dt>
                <dd className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-wide text-xl font-semibold tabular-nums">{formatBand(usedBand.low, usedBand.high, country)}</span>
                  <span className="text-sm text-muted">{usedBand.year} car</span>
                  {oldest !== null && newest !== null && live(oldest, newest) && (
                    <a href={live(oldest, newest)!} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline decoration-signal decoration-2 underline-offset-4">
                      Live prices ↗
                    </a>
                  )}
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-4 text-xs text-muted">Range is a real-world estimate, not the official WLTP figure.</p>
        </header>
      </div>

      {/* ---------- Summary ---------- */}
      <section aria-labelledby="summary-title" className="mt-12">
        <SectionTitle id="summary-title">The {m.name} at a glance</SectionTitle>
        <div className="mt-4 grid max-w-[66ch] gap-4 text-[17px] leading-relaxed text-pretty">
          {modelSummary(m).map((p) => (
            <p key={p.slice(0, 40)}>{u(p)}</p>
          ))}
        </div>
        <p className="mt-5 max-w-[66ch] border-l-4 border-signal pl-3 text-sm text-muted">
          Written from the figures on this page. Each version&rsquo;s own page has its full specifications and a link to its EV Database entry.
        </p>
      </section>

      {/* ---------- Every version ---------- */}
      <section aria-labelledby="versions-title" className="mt-12">
        <SectionTitle id="versions-title">Every version of the {m.name}</SectionTitle>
        <ModelVersions groups={tables} />
      </section>

      <AdSlot slot="model-mid" className="mt-12" />

      {/* ---------- Used ---------- */}
      {country && byYear.length > 0 && (
        <section aria-labelledby="used-title" className="mt-12">
          <SectionTitle id="used-title">Buying a used {m.name}</SectionTitle>
          <p className="mt-2 max-w-[66ch] text-muted text-pretty">
            Likely asking prices by model year for an average-mileage example, from the cheapest version to the dearest, estimated from
            prices when new and checked against real UK listings. They&rsquo;re estimates, not valuations, so check real listings before you budget.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--line)]">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-accent-soft text-left text-xs text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Model year</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Likely price (est.)</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium sm:px-5">Best range today (est.)</th>
                </tr>
              </thead>
              <tbody>
                {byYear.map((e) => (
                  <tr key={e.year} className="border-t border-line">
                    <th scope="row" className="px-4 py-2.5 text-left font-semibold sm:px-5">{e.year}</th>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold">{formatBand(e.low, e.high, country)}</span>
                      {live(e.year, e.year) && (
                        <a href={live(e.year, e.year)!} target="_blank" rel="noopener noreferrer" className="block text-xs font-semibold underline decoration-signal underline-offset-2 sm:inline sm:pl-2">
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
        </section>
      )}

      {/* ---------- Warranty ---------- */}
      <section aria-labelledby="warranty-title" className="mt-12">
        <SectionTitle id="warranty-title">Warranty (UK)</SectionTitle>
        {!w ? (
          <p className="mt-3 max-w-[66ch] text-muted text-pretty">
            We haven&rsquo;t been able to confirm {m.make}&rsquo;s UK warranty from an official source yet. Ask the seller or a {m.make} dealer.
          </p>
        ) : w.closed ? (
          <p className="mt-3 max-w-[66ch] text-pretty">{w.closed}</p>
        ) : (
          <>
            <dl className="mt-4 grid gap-px overflow-hidden rounded-2xl bg-line shadow-[0_0_0_1px_var(--line)] sm:grid-cols-3">
              <Item label="Car warranty" value={w.car ? formatTerm(w.car) : "Not confirmed"} />
              <Item label="Battery warranty" value={w.battery ? formatBattery(w.battery) : "Not confirmed"} />
              <Item label="Passes to the next owner" value={TRANSFER_LABEL[w.transfer]} />
            </dl>
            <p className="mt-3 max-w-[66ch] text-sm text-muted text-pretty">
              Today&rsquo;s terms for new cars. For a used one, each version&rsquo;s page estimates how much warranty is likely left.
            </p>
          </>
        )}
      </section>

      {/* ---------- Rivals ---------- */}
      {rivals.length > 0 && (
        <section aria-labelledby="rivals-title" className="mt-12">
          <SectionTitle id="rivals-title">{m.name} vs its rivals</SectionTitle>
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

      {/* ---------- Sources ---------- */}
      <section aria-labelledby="source-title" className="mt-12 rounded-2xl bg-ink p-6 text-sm text-on-ink/80 sm:p-8">
        <h2 id="source-title" className="font-wide text-xl font-semibold text-on-ink">About the figures</h2>
        <p className="mt-3 max-w-[66ch] leading-relaxed">
          Figures come from{" "}
          <EvdbLink car={m.lead} className="underline decoration-on-ink/30 underline-offset-2 hover:text-on-ink">
            EV Database
          </EvdbLink>{" "}
          (each version links to its own entry), extracted <time dateTime={UPDATED_ISO}>{UPDATED_LABEL}</time>. Range is a real-world
          estimate, not the official WLTP figure. UK prices are starting prices including VAT.
        </p>
        {m.lead.imageCredit && (
          <p className="mt-3 text-xs text-on-ink/55">
            Photo: {photoSubject(m.lead.imageCredit)}, by{" "}
            <a href={m.lead.imageCredit.source} target="_blank" rel="noopener noreferrer" className="underline decoration-on-ink/30 underline-offset-2">
              {m.lead.imageCredit.author}
            </a>{" "}
            (
            <a href={m.lead.imageCredit.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline decoration-on-ink/30 underline-offset-2">
              {m.lead.imageCredit.license}
            </a>
            ), Wikimedia Commons.
          </p>
        )}
      </section>

      <div className="mt-12">
        <QuizCta />
      </div>
    </article>
  );
}

/** A table row for one version. */
function row(c: Car, country: Model["country"]): VersionTable["rows"][number] {
  const price = country && c.status === "Available" ? newPrice(c, country) : null;
  const used = country && c.status !== "Available" ? usedFrom(c, country) : null;
  return {
    href: carHref(c),
    name: c.model,
    years: c.status === "Upcoming" ? "Coming soon" : c.status === "Available" ? `${c.yearFrom} on` : c.yearTo && c.yearTo !== c.yearFrom ? `${c.yearFrom}–${c.yearTo}` : `${c.yearFrom}`,
    rangeKm: c.rangeKm,
    range: formatMi(c.rangeKm),
    whPerKm: c.whPerKm,
    efficiency: formatMiPerKwh(c.whPerKm),
    batteryKwh: c.batteryKwh,
    fastchargeKw: c.fastchargeKw,
    price,
    priceText: price !== null && country ? formatMoney(price, country) : used && country ? `used ${formatBand(used.low, used.high, country)}` : "–",
  };
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-4 sm:p-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-semibold text-pretty">{value}</dd>
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

/** schema.org ProductGroup-style summary: the model, with its range of prices. */
function jsonLd(m: Model) {
  const prices = m.onSale.map((c) => c.priceGbp).filter((p): p is number => p !== null);
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: m.name,
    brand: { "@type": "Brand", name: m.make },
    url: `${SITE_URL}${modelHref(m)}`,
    image: m.lead.image ?? undefined,
    description: plain(`Real-world range ${rangeSpan(m)}; ${formatEfficiency(m.versions[0].whPerKm)} for the newest version.`),
    hasVariant: m.versions.map((c) => ({ "@type": "Car", name: `${c.make} ${c.model}`, url: `${SITE_URL}${carHref(c)}` })),
    ...(prices.length
      ? { offers: { "@type": "AggregateOffer", priceCurrency: "GBP", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length } }
      : {}),
  };
}
