import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import QuizCta from "@/components/QuizCta";
import { u } from "@/components/UnitText";
import WltpTable, { type WltpRow } from "@/components/WltpTable";
import { DataSourceNote } from "@/components/EvdbLink";
import { bodyLabel, bodyPlural } from "@/lib/carProfile";
import { carHref, type Car } from "@/lib/cars";
import { formatMiles } from "@/lib/format";
import { breadcrumbLd } from "@/lib/jsonld";
import { SITE_NAME, SITE_URL, UPDATED_ISO, UPDATED_LABEL, WLTP_HREF } from "@/lib/site";
import { both, plainDeep } from "@/lib/units";
import { BRAND_MIN_MODELS, bodyRows, brandRows, pct, shareQuantile, typicalShare, wltpCars, wltpOutliers, wltpShare } from "@/lib/wltp";

const TITLE = "Real-world range vs WLTP: every UK electric car compared";
const CSV_HREF = `${WLTP_HREF}/data.csv`;

const best = wltpCars[0];
const worst = wltpCars[wltpCars.length - 1];
const bodies = bodyRows();
const lowestBody = bodies[bodies.length - 1];

export const metadata: Metadata = plainDeep({
  title: `${TITLE} (${new Date(UPDATED_ISO).getUTCFullYear()})`,
  description:
    `How much of its official WLTP range each of ${wltpCars.length} electric cars on sale in the UK manages in real-world driving. ` +
    `The typical EV gets ${pct(typicalShare)}; the closest is the ${best.make} ${best.model} at ${pct(wltpShare(best)!)}. Brand league table and free data.`,
  alternates: { canonical: WLTP_HREF },
  openGraph: {
    title: TITLE,
    description: `The typical UK electric car gets ${pct(typicalShare)} of its official WLTP range in real-world driving. Every car and brand compared.`,
    type: "article",
    images: [{ url: "/api/og/page/real-range-vs-wltp", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
});

const row = (c: Car & { priceGbp: number; wltpKm: number | null }): WltpRow => ({
  slug: c.slug,
  make: c.make,
  model: c.model,
  body: c.body,
  bodyLabel: bodyLabel(c.body),
  rangeKm: c.rangeKm,
  wltpKm: c.wltpKm!,
  share: wltpShare(c)!,
  priceGbp: c.priceGbp,
});

const name = (c: Car) => `${c.make} ${c.model}`;

export default function RealRangeVsWltpPage() {
  const outliers = wltpOutliers();
  const topBrand = brandRows[0];
  const lastBrand = brandRows[brandRows.length - 1];

  return (
    <article className="mx-auto max-w-4xl">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Rankings", path: "/best" },
            { name: "Real-world range vs WLTP", path: WLTP_HREF },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Dataset",
            name: TITLE,
            description: `Real-world range and official WLTP range for ${wltpCars.length} electric cars on sale new in the UK, with the share of the official figure each achieves.`,
            url: `${SITE_URL}${WLTP_HREF}`,
            creator: { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/` },
            isBasedOn: "https://ev-database.org/",
            dateModified: UPDATED_ISO,
            distribution: [{ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${SITE_URL}${CSV_HREF}` }],
          },
        ]}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex gap-2">
          <li>
            <Link href="/" className="hover:text-foreground">Home</Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/best" className="hover:text-foreground">Rankings</Link>
          </li>
        </ol>
      </nav>

      <header className="mt-4">
        <h1 className="font-wide text-3xl font-semibold leading-[1.1] text-balance sm:text-[2.6rem]">{TITLE}</h1>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <time dateTime={UPDATED_ISO}>Updated {UPDATED_LABEL}</time>
          <span>{wltpCars.length} cars compared</span>
        </p>
        <p className="mt-5 max-w-[64ch] text-lg leading-relaxed text-pretty">
          Every new electric car&rsquo;s advertised range comes from the WLTP lab test. We put it next to the real-world range for the{" "}
          {wltpCars.length} electric cars on sale in the UK, to show how much of the official figure each one manages in everyday driving.
        </p>
      </header>

      {/* ---------- Findings ---------- */}
      <section aria-labelledby="findings-title" className="mt-10">
        <h2 id="findings-title" className="font-wide text-xl font-semibold sm:text-2xl">What we found</h2>
        <dl className="mt-4 grid gap-px overflow-hidden rounded-2xl bg-line shadow-[0_0_0_1px_var(--line)] sm:grid-cols-3">
          <Finding label="The typical electric car gets" value={pct(typicalShare)} sub="of its official range in real-world driving" strong />
          <Finding label="Closest to its official range" value={pct(wltpShare(best)!)} sub={carLine(best)} href={carHref(best)} />
          <Finding label="Furthest short" value={pct(wltpShare(worst)!)} sub={carLine(worst)} href={carHref(worst)} />
        </dl>
        <ul className="mt-5 grid max-w-[66ch] list-disc gap-2 pl-5 leading-relaxed text-pretty">
          <li>
            Half of all cars land between {pct(shareQuantile(0.25))} and {pct(shareQuantile(0.75))} of the official figure, so a car advertised at 300
            miles typically manages about {Math.round(300 * typicalShare)} in real-world driving.
          </li>
          <li>
            Shape matters: {bodyPlural(bodies[0].body)} typically get {pct(bodies[0].share)} of their official range, SUVs{" "}
            {pct(bodies.find((b) => b.body === "SUV")?.share ?? typicalShare)} and {bodyPlural(lowestBody.body)} only {pct(lowestBody.share)}. Tall, boxy
            shapes are hit harder by air resistance at motorway speeds, which the lab test puts less weight on.
          </li>
          <li>
            By brand, {topBrand.make}&rsquo;s cars come closest to their official ranges ({pct(topBrand.share)} typical) and {lastBrand.make}&rsquo;s fall
            furthest short ({pct(lastBrand.share)}).
          </li>
        </ul>
      </section>

      {/* ---------- What "real-world" means ---------- */}
      <section id="real-world" aria-labelledby="real-world-title" className="mt-10 max-w-[66ch] rounded-2xl bg-card p-5 shadow-[0_0_0_1px_var(--line)] sm:p-6">
        <h2 id="real-world-title" className="font-wide text-xl font-semibold">Whose real world?</h2>
        <p className="mt-2 leading-relaxed text-pretty">
          The real-world figure is EV Database&rsquo;s estimate for a mix of town and motorway driving in average weather, with a moderate driving
          style. It&rsquo;s a sensible middle figure, not everyone&rsquo;s real world:
        </p>
        <ul className="mt-3 grid list-disc gap-2 pl-5 leading-relaxed text-pretty">
          <li>
            <strong>Mostly town driving in mild weather:</strong> you&rsquo;ll often get close to the official figure, or beat it. The WLTP test is
            mostly lower-speed driving, which suits electric cars.
          </li>
          <li>
            <strong>Mostly motorway:</strong> expect less than the real-world figure. EV Database works out motorway range at a steady{" "}
            {u(both("68 mph", "110 km/h"))}.
          </li>
          <li>
            <strong>Cold weather:</strong> expect less again, because heating uses energy. EV Database&rsquo;s cold-weather figures assume &minus;10°C
            with the heating on, and its mild ones 23°C with no air conditioning.
          </li>
        </ul>
        <p className="mt-3 leading-relaxed text-pretty">
          The share of WLTP is most useful for comparing cars, because every car is measured the same way. A big gap usually means a car loses more
          range at speed. Each car&rsquo;s page links to its EV Database entry, which breaks range down by town and motorway, in cold and mild weather.
        </p>
      </section>

      {/* ---------- By brand ---------- */}
      <section aria-labelledby="brands-title" className="mt-12">
        <h2 id="brands-title" className="font-wide text-xl font-semibold sm:text-2xl">Brand league table</h2>
        <p className="mt-2 max-w-[66ch] text-muted text-pretty">
          The typical (median) share of official range across each brand&rsquo;s electric cars on sale in the UK, for brands with at least{" "}
          {BRAND_MIN_MODELS} models.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl bg-card shadow-[0_0_0_1px_var(--line)]">
          <table className="w-full min-w-[34rem] text-sm tabular-nums">
            <caption className="sr-only">Brands ranked by the typical share of official WLTP range their electric cars achieve</caption>
            <thead className="bg-accent-soft text-left text-xs text-muted">
              <tr>
                <th scope="col" className="px-3 py-2.5 font-medium sm:px-4">#</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Brand</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Typical share</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Closest</th>
                <th scope="col" className="px-3 py-2.5 font-medium sm:pr-4">Furthest short</th>
              </tr>
            </thead>
            <tbody>
              {brandRows.map((b, i) => (
                <tr key={b.make} className="border-t border-line align-top">
                  <td className="px-3 py-2.5 text-muted sm:px-4">{i + 1}</td>
                  <th scope="row" className="px-3 py-2.5 text-left font-semibold">
                    {b.make}
                    <span className="block text-xs font-normal text-muted">
                      {b.models} models, {b.versions} versions
                    </span>
                  </th>
                  <td className="px-3 py-2.5 text-right text-base font-semibold">{pct(b.share)}</td>
                  <td className="px-3 py-2.5">
                    <Link href={carHref(b.best)} className="hover:underline">
                      {b.best.model}
                    </Link>{" "}
                    <span className="text-muted">{pct(wltpShare(b.best)!)}</span>
                  </td>
                  <td className="px-3 py-2.5 sm:pr-4">
                    <Link href={carHref(b.worst)} className="hover:underline">
                      {b.worst.model}
                    </Link>{" "}
                    <span className="text-muted">{pct(wltpShare(b.worst)!)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Every car ---------- */}
      <section aria-labelledby="all-title" className="mt-12">
        <h2 id="all-title" className="font-wide text-xl font-semibold sm:text-2xl">Every electric car on sale</h2>
        <p className="mt-2 mb-4 max-w-[66ch] text-muted text-pretty">Sort by any column or narrow it to one body style. Each car links to its full page.</p>
        <WltpTable rows={wltpCars.map(row)} typical={typicalShare} />
      </section>

      {/* ---------- Use this data ---------- */}
      <section aria-labelledby="use-title" className="mt-12 rounded-2xl bg-card p-5 shadow-[0_0_0_1px_var(--line)] sm:p-6">
        <h2 id="use-title" className="font-wide text-xl font-semibold">Use this data</h2>
        <p className="mt-2 max-w-[66ch] leading-relaxed text-pretty">
          You&rsquo;re welcome to quote these figures or use the table in an article, video or post. Please credit {SITE_NAME} with a link to this
          page:
        </p>
        <p className="mt-3 rounded-lg bg-background px-3 py-2 font-mono text-sm break-all select-all">
          Source: {SITE_NAME}, {SITE_URL.replace(/^https?:\/\//, "")}
          {WLTP_HREF}
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
          <a href={CSV_HREF} download className="underline decoration-signal decoration-2 underline-offset-4">
            Download the full table (CSV)
          </a>
          <Link href="/about#contact" className="underline decoration-line underline-offset-4 hover:decoration-foreground">
            Questions or corrections
          </Link>
        </p>
      </section>

      {/* ---------- Method ---------- */}
      <section aria-labelledby="method-title" className="mt-12 max-w-[66ch]">
        <h2 id="method-title" className="font-wide text-xl font-semibold sm:text-2xl">How we compared them</h2>
        <div className="mt-3 grid gap-3 leading-relaxed text-pretty">
          <p>
            Both figures come from EV Database. The official range is the WLTP figure. The real-world range is EV Database&rsquo;s estimate for
            mixed town and motorway driving in average weather, the same figure used across {SITE_NAME} (see{" "}
            <a href="#real-world">whose real world?</a> above).
          </p>
          <p>
            The table covers electric cars on sale new in the UK with both figures. Where a car comes in several versions, each version is listed.
            {outliers.length > 0 && (
              <>
                {" "}
                We left out {outliers.length} {outliers.length === 1 ? "car" : "cars"} whose figures don&rsquo;t look consistent yet (real-world range above
                the official figure, or under 60% of it): {outliers.map(name).join(", ")}.
              </>
            )}
          </p>
          <p>
            <Link href="/methodology#range">How we work out the figures</Link> explains real-world range in more detail.
          </p>
        </div>
        <DataSourceNote className="mt-4" />
      </section>

      <div className="mt-12">
        <QuizCta />
      </div>
    </article>
  );
}

/** "Lotus Emeya 900: 289 of 301 miles" (unit-switchable). */
const carLine = (c: Car) => (
  <>
    {name(c)}: {u(formatMiles(c.rangeKm))} of {u(formatMiles(c.wltpKm!))}
  </>
);

function Finding({ label, value, sub, href, strong = false }: { label: string; value: string; sub: React.ReactNode; href?: string; strong?: boolean }) {
  return (
    <div className={`p-4 sm:p-5 ${strong ? "bg-accent-soft" : "bg-card"}`}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-wide mt-1 text-3xl font-semibold tabular-nums">{value}</dd>
      <dd className="mt-1 text-sm text-pretty">{href ? <Link href={href} className="hover:underline">{sub}</Link> : sub}</dd>
    </div>
  );
}
