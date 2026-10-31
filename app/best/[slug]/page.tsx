import type { Metadata } from "next";
import { u } from "@/components/UnitText";
import { plain, plainDeep } from "@/lib/units";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import CarCard from "@/components/CarCard";
import { CompareBar } from "@/components/ComparePicks";
import QuizCta from "@/components/QuizCta";
import ShowMore from "@/components/ShowMore";
import JsonLd from "@/components/JsonLd";
import { carHref } from "@/lib/cars";
import { breadcrumbLd, itemListLd } from "@/lib/jsonld";
import { CARS_PER_PAGE, getRankingPage, RANKING_MAX, rankingPages, relatedPages, shortLabel } from "@/lib/rankings";
import { UPDATED_ISO, UPDATED_LABEL } from "@/lib/site";
import { DataSourceNote } from "@/components/EvdbLink";
import { getUsedRankingPage, USED_PER_PAGE, usedRankingPages, type UsedRankingPage } from "@/lib/usedRankings";

type Props = { params: Promise<{ slug: string }> };

// Only the slugs returned below exist; any other /best/* URL returns 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return [...rankingPages, ...usedRankingPages].map((p) => ({ slug: p.slug }));
}

// Titles and descriptions are shown by search engines and share previews, which can't switch units: always miles.
export async function generateMetadata(props: Props): Promise<Metadata> {
  return plainDeep(await metadataFor(props));
}

async function metadataFor({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const page = getRankingPage(slug) ?? getUsedRankingPage(slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `/best/${page.slug}` },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      type: "article",
      images: [{ url: `/api/og/best/${page.slug}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RankingPage({ params }: Props) {
  const slug = (await params).slug;
  const used = getUsedRankingPage(slug);
  if (used) return <UsedRanking page={used} />;
  const page = getRankingPage(slug);
  if (!page) notFound();

  const shown = page.ranked.slice(0, CARS_PER_PAGE);
  const MID = 5; // an ad sits between the top 5 and the rest of the list
  const [leader, ...others] = shown;
  const upper = others.slice(0, MID - 1); // ranks 2–5
  const lower = others.slice(MID - 1); // ranks 6–10
  const related = relatedPages(page);

  return (
    <article className="mx-auto max-w-3xl">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Rankings", path: "/best" },
            { name: plain(shortLabel(page)), path: `/best/${page.slug}` },
          ]),
          itemListLd(plain(page.h1), shown.map((c) => ({ name: `${c.make} ${c.model}`, path: carHref(c) }))),
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
        <h1 className="font-wide text-3xl font-semibold leading-[1.1] text-balance sm:text-[2.6rem]">{page.h1}</h1>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <time dateTime={UPDATED_ISO}>Updated {UPDATED_LABEL}</time>
          <span>{page.ranked.length} cars compared</span>
        </p>
        <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-pretty">{u(page.intro)}</p>
        <p className="mt-5 max-w-[70ch] border-l-4 border-signal pl-3 text-sm text-muted">{u(page.method)}</p>
        <DataSourceNote className="mt-3" />
      </header>

      <div className="mt-8">
        <QuizCta compact />
      </div>

      <AdSlot slot="ranking-top" className="mt-8" />

      <h2 className="sr-only">The ranking</h2>
      <ol className="mt-8">
        <li>
          <CarCard car={leader} rank={1} metric={page.metric} headingLevel={3} returnLabel={shortLabel(page)} featured />
        </li>
      </ol>
      {upper.length > 0 && (
        <ol start={2} className="mt-4 grid gap-4">
          {upper.map((car, i) => (
            <li key={car.id}>
              <CarCard car={car} rank={i + 2} metric={page.metric} headingLevel={3} returnLabel={shortLabel(page)} />
            </li>
          ))}
        </ol>
      )}

      {lower.length > 0 && (
        <>
          <AdSlot slot="ranking-mid" className="my-8" />
          <ol start={MID + 1} className="grid gap-4">
            {lower.map((car, i) => (
              <li key={car.id}>
                <CarCard car={car} rank={MID + i + 1} metric={page.metric} headingLevel={3} returnLabel={shortLabel(page)} />
              </li>
            ))}
          </ol>
        </>
      )}
      <ShowMore
        start={shown.length + 1}
        total={page.ranked.length}
        items={page.ranked.slice(shown.length, RANKING_MAX).map((car, i) => (
          <CarCard key={car.id} car={car} rank={shown.length + i + 1} metric={page.metric} headingLevel={3} returnLabel={shortLabel(page)} />
        ))}
      />

      <div className="mt-12">
        <QuizCta />
      </div>

      <AdSlot slot="ranking-bottom" className="mt-10" />

      {related.length > 0 && (
        <nav aria-labelledby="more-rankings" className="mt-12">
          <h2 id="more-rankings" className="font-wide text-lg font-semibold">More rankings</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {related.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/best/${p.slug}`}
                  className="block h-full rounded-xl bg-card px-4 py-3.5 text-[15px] font-medium shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1.5px_var(--foreground)]"
                >
                  {shortLabel(p)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  );
}

/** A used-car ranking: the same layout, with used prices and range today on each card. */
function UsedRanking({ page }: { page: UsedRankingPage }) {
  const shown = page.entries.slice(0, USED_PER_PAGE);
  const others = usedRankingPages.filter((p) => p.slug !== page.slug);
  const card = (e: (typeof shown)[number], rank: number) => (
    <CarCard
      car={e.car}
      rank={rank}
      metric="range"
      headingLevel={3}
      returnLabel={page.label.toLowerCase()}
      featured={rank === 1}
      market={{
        country: "uk",
        offer: { newPrice: null, used: e.pick },
        title: e.car.variant,
        years: e.yearFrom === e.yearTo ? `${e.yearFrom} cars` : `${e.yearFrom}–${e.yearTo} cars`,
      }}
    />
  );
  return (
    <article className="mx-auto max-w-3xl">
      <JsonLd
        data={[
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Rankings", path: "/best" },
            { name: page.label, path: `/best/${page.slug}` },
          ]),
          itemListLd(page.h1, shown.map((e) => ({ name: `${e.car.make} ${e.car.variant}`, path: carHref(e.car) }))),
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
        <h1 className="font-wide text-3xl font-semibold leading-[1.1] text-balance sm:text-[2.6rem]">{page.h1}</h1>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <time dateTime={UPDATED_ISO}>Updated {UPDATED_LABEL}</time>
          <span>{page.entries.length} models compared</span>
        </p>
        <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-pretty">{u(page.intro)}</p>
        <p className="mt-5 max-w-[70ch] border-l-4 border-signal pl-3 text-sm text-muted">{u(page.method)}</p>
        <DataSourceNote className="mt-3" />
      </header>

      <AdSlot slot="ranking-top" className="mt-8" />

      <h2 className="sr-only">The ranking</h2>
      <ol className="mt-8 grid gap-4">
        {shown.map((e, i) => (
          <li key={e.car.id}>{card(e, i + 1)}</li>
        ))}
      </ol>
      <ShowMore
        start={shown.length + 1}
        total={page.entries.length}
        noun="models"
        items={page.entries.slice(shown.length, RANKING_MAX).map((e, i) => card(e, shown.length + i + 1))}
      />
      {page.entries.length > RANKING_MAX && (
        <p className="mt-2 text-sm">
          <Link href="/cars?condition=used" className="font-semibold underline underline-offset-4">
            See every used EV
          </Link>
        </p>
      )}

      <div className="mt-12">
        <QuizCta />
      </div>

      <AdSlot slot="ranking-bottom" className="mt-10" />

      <nav aria-labelledby="more-used" className="mt-12">
        <h2 id="more-used" className="font-wide text-lg font-semibold">More used-car rankings</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {others.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/best/${p.slug}`}
                className="block h-full rounded-xl bg-card px-4 py-3.5 text-[15px] font-medium shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1.5px_var(--foreground)]"
              >
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <CompareBar country="uk" />
    </article>
  );
}
