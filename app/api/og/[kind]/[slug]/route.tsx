import type { ReactElement } from "react";
import { formatPounds, runningCost, RUNNING_DEFAULTS } from "@/lib/running";
import { plain } from "@/lib/units";
import { ImageResponse } from "next/og";
import { CarCard, H, ListCard, SiteCard, VsCard, W } from "@/components/ShareCards";
import type { Car } from "@/lib/cars";
import { getCarBySlug } from "@/lib/carProfile";
import { formatMi } from "@/lib/format";
import { getRankingPage } from "@/lib/rankings";
import { getVsPage } from "@/lib/rivals";
import { getUsedRankingPage } from "@/lib/usedRankings";

/**
 * Share images (Open Graph, 1200×630) drawn on request: /api/og/car/{slug}, /api/og/vs/{slug}, /api/og/best/{slug}
 * and /api/og/site/home. Drawn with next/og (only the flexbox subset of CSS works there). Car photos come from
 * Wikimedia; if one can't be fetched the card is drawn without it. Cached for a week.
 */

// Share images are for link previews, not search results: X-Robots-Tag keeps them out of Google's index (previews still work).
const CACHE = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

type Params = { params: Promise<{ kind: string; slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { kind, slug } = await params;
  let body: ReactElement | null = null;

  if (kind === "car") {
    const car = getCarBySlug(slug);
    if (car) body = <CarCard car={car} photo={await photoData(car)} />;
  } else if (kind === "vs") {
    const page = getVsPage(slug);
    if (page) {
      const [pa, pb] = await Promise.all([photoData(page.a.car), photoData(page.b.car)]);
      body = <VsCard a={page.a.car} b={page.b.car} names={[page.a.name, page.b.name]} photos={[pa, pb]} />;
    }
  } else if (kind === "best") {
    const ranking = getRankingPage(slug);
    const used = getUsedRankingPage(slug);
    if (ranking) {
      body = (
        <ListCard
          title={ranking.h1}
          lines={ranking.ranked
            .slice(0, 3)
            .map((c) =>
              ranking.metric === "running"
                ? `${c.make} ${c.model} · ${formatPounds(runningCost(c.whPerKm, RUNNING_DEFAULTS).perMonth)} a month`
                : ranking.metric === "onestop"
                  ? `${c.make} ${c.model} · ${plain(formatMi(c.oneStopKm))} with one stop`
                  : ranking.metric === "charging"
                    ? `${c.make} ${c.model} · ${c.fastchargeKw} kW average`
                    : `${c.make} ${c.model} · ${plain(formatMi(c.rangeKm))}`,
            )}
        />
      );
    } else if (used) {
      body = (
        <ListCard
          title={used.h1}
          lines={used.entries.slice(0, 3).map((e) => `${e.car.make} ${e.car.variant} (${e.pick.year}) · about ${plain(formatMi(e.pick.rangeTodayKm))} today`)}
        />
      );
    }
  } else if (kind === "site") {
    body = <SiteCard />;
  }

  if (!body) return new Response("Not found", { status: 404 });
  return new ImageResponse(body, { width: W, height: H, headers: { "Cache-Control": CACHE, "X-Robots-Tag": "noindex" } });
}

/** The car's photo as a data URL (JPEG/PNG only), or null. */
async function photoData(car: Car): Promise<string | null> {
  if (!car.image) return null;
  try {
    const res = await fetch(car.image, {
      headers: { "User-Agent": "PlainEV/1.0 (https://plainev.com; share images)" },
      signal: AbortSignal.timeout(5000),
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/image\/(jpeg|png)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

