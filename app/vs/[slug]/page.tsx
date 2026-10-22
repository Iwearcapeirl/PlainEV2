import type { Metadata } from "next";
import { u } from "@/components/UnitText";
import { plainDeep } from "@/lib/units";
import Link from "next/link";
import { notFound } from "next/navigation";
import CarImage from "@/components/CarImage";
import CompareRows, { COLS_2 } from "@/components/CompareTable";
import EvdbLink from "@/components/EvdbLink";
import QuizCta from "@/components/QuizCta";
import { carHref } from "@/lib/cars";
import { compareHref, compareTable } from "@/lib/compare";
import { formatGbp, formatMi } from "@/lib/format";
import { photoSubject } from "@/lib/photo";
import { featuredVsPages, getVsPage, verdict, vsDescription, vsPagesFor, vsTitle, type Rival } from "@/lib/rivals";
import { DATA_YEAR, UPDATED_ISO, UPDATED_LABEL } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// One page per rival pair (lib/rivals.ts); any other /vs/* URL is a 404. Only the well-known match-ups are built with
// each deployment (to keep deployments small); the rest are built on their first visit, then saved.
export const dynamicParams = true;

export function generateStaticParams() {
  return featuredVsPages(100).map((p) => ({ slug: p.slug }));
}

// Titles and descriptions are shown by search engines and share previews, which can't switch units: always miles.
export async function generateMetadata(props: Props): Promise<Metadata> {
  return plainDeep(await metadataFor(props));
}

async function metadataFor({ params }: Props): Promise<Metadata> {
  const page = getVsPage((await params).slug);
  if (!page) return {};
  const title = `${vsTitle(page)}: which is better? (${DATA_YEAR})`;
  return {
    title,
    description: vsDescription(page),
    alternates: { canonical: `/vs/${page.slug}` },
    openGraph: { title, description: vsDescription(page), type: "article", images: [{ url: `/api/og/vs/${page.slug}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function VsPage({ params }: Props) {
  const page = getVsPage((await params).slug);
  if (!page) notFound();
  const { a, b } = page;
  const table = compareTable([a.car, b.car], "uk");
  const others = [...new Set([...vsPagesFor(a.name), ...vsPagesFor(b.name)])].filter((p) => p.slug !== page.slug).slice(0, 6);

  return (
    <article className="mx-auto max-w-4xl">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex gap-2">
          <li><Link href="/" className="hover:text-foreground">Home</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/best#head-to-head" className="hover:text-foreground">Head-to-head</Link></li>
        </ol>
      </nav>

      <header className="mt-4">
        <h1 className="font-wide text-3xl font-semibold leading-[1.1] text-balance sm:text-[2.6rem]">
          {a.name} vs {b.name}
        </h1>
        <p className="mt-3 text-sm text-muted">
          <time dateTime={UPDATED_ISO}>Updated {UPDATED_LABEL}</time> · Real-world figures, not WLTP
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5">
        {[a, b].map((r, i) => (
          <Side key={r.name} r={r} priority={i === 0} wins={table.tally.wins[i]} of={table.tally.of} />
        ))}
      </div>

      <section aria-labelledby="verdict-title" className="mt-10">
        <h2 id="verdict-title" className="font-wide text-2xl font-semibold">Our verdict</h2>
        <div className="mt-4 grid max-w-[66ch] gap-3 text-[17px] leading-relaxed text-pretty">
          {verdict(page).map((p) => (
            <p key={p.slice(0, 40)}>{u(p)}</p>
          ))}
        </div>
        <p className="mt-4 max-w-[66ch] border-l-4 border-signal pl-3 text-sm text-muted">
          Written from the figures below, comparing the cheapest UK version of each. Other versions can differ: open them in{" "}
          <Link href={compareHref([a.car.slug, b.car.slug])} className="font-semibold text-foreground underline underline-offset-4">
            Compare
          </Link>{" "}
          to swap versions.
        </p>
      </section>

      <section aria-label="Side by side" className="mt-8">
        <div className={`sticky top-0 z-20 -mx-4 border-b border-line bg-background/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0 ${COLS_2}`}>
          <span className="hidden sm:block" />
          {[a, b].map((r) => (
            <span key={r.name} className="line-clamp-2 text-xs font-semibold sm:text-sm">{r.name}</span>
          ))}
        </div>
        <CompareRows table={table} cols={COLS_2} />
        <p className="mt-6 text-xs text-muted">
          Green marks the better figure in each row. Figures come from EV Database (linked under each car above; every version&rsquo;s
          own page links to its entry there). Range is a real-world estimate, not WLTP. Used prices are estimates. Warranty terms are UK
          terms from each maker&rsquo;s website.
        </p>
      </section>

      <section aria-labelledby="versions-title" className="mt-12">
        <h2 id="versions-title" className="font-wide text-xl font-semibold">Every version</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          {[a, b].map((r) => (
            <div key={r.name}>
              <h3 className="font-semibold">{r.name}</h3>
              <ul className="mt-2 grid gap-1.5 text-sm">
                {r.versions.map((v) => (
                  <li key={v.id} className="flex items-baseline justify-between gap-3 border-t border-line pt-1.5">
                    <Link href={carHref(v)} className="min-w-0 underline decoration-line underline-offset-4 hover:decoration-foreground">
                      {v.model}
                    </Link>
                    <span className="shrink-0 tabular-nums text-muted">
                      {formatGbp(v.priceGbp)} · {u(formatMi(v.rangeKm))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {others.length > 0 && (
        <nav aria-labelledby="more-vs" className="mt-12">
          <h2 id="more-vs" className="font-wide text-lg font-semibold">More comparisons</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {others.map((p) => (
              <li key={p.slug}>
                <Link href={`/vs/${p.slug}`} className="block rounded-xl bg-card px-4 py-3.5 text-[15px] font-medium shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1.5px_var(--foreground)]">
                  {vsTitle(p)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-12">
        <QuizCta />
      </div>
    </article>
  );
}

function Side({ r, priority, wins, of }: { r: Rival; priority: boolean; wins: number; of: number }) {
  const c = r.car;
  return (
    <div className="min-w-0">
      <CarImage
        src={c.image}
        credit={c.imageCredit}
        make={c.make}
        model={c.model}
        priority={priority}
        alt={c.imageCredit ? photoSubject(c.imageCredit) : undefined}
        frameClass="aspect-[16/10] rounded-xl shadow-[0_0_0_1px_var(--line)]"
        sizes="(min-width: 768px) 440px, 50vw"
      />
      <p className="mt-2 text-xs text-muted sm:text-sm">{r.name}</p>
      <Link href={carHref(c)} className="block text-sm font-semibold leading-tight hover:underline sm:text-base">
        {c.model}
      </Link>
      <p className="mt-1 text-sm tabular-nums">
        <span className="font-semibold">{formatGbp(c.priceGbp)}</span> <span className="text-muted">· {u(formatMi(c.rangeKm))}</span>
      </p>
      <p className="mt-1.5 inline-block rounded-full bg-win px-2 py-0.5 text-xs font-semibold">
        Wins {wins} of {of}
      </p>
      <p className="mt-1.5 text-xs text-muted">
        Source:{" "}
        <EvdbLink car={c} className="underline decoration-line underline-offset-2 hover:text-foreground">
          EV Database
        </EvdbLink>
      </p>
    </div>
  );
}
