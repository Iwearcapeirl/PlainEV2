import { carHref } from "@/lib/cars";
import { bodyLabel } from "@/lib/carProfile";
import { SITE_NAME, SITE_URL, UPDATED_ISO } from "@/lib/site";
import { brandOf, wltpCars, wltpShare } from "@/lib/wltp";

// Built once per deployment, like the pages.
export const dynamic = "force-static";

const KM_PER_MILE = 1.609344;
const cell = (v: string | number) => (typeof v === "string" && /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : String(v));

/** The real-world vs WLTP table as CSV, for anyone citing it (credit and link requested on the page). */
export function GET() {
  const head = ["Brand", "Make", "Model", "Body style", "UK price (GBP)", "Real-world range (miles)", "WLTP range (miles)", "Real-world range (km)", "WLTP range (km)", "Share of WLTP (%)", "EV Database page", "PlainEV page"];
  const rows = wltpCars.map((c) => [
    brandOf(c),
    c.make,
    c.model,
    bodyLabel(c.body),
    c.priceGbp,
    Math.round(c.rangeKm / KM_PER_MILE),
    Math.round(c.wltpKm! / KM_PER_MILE),
    c.rangeKm,
    c.wltpKm!,
    Math.round(wltpShare(c)! * 1000) / 10,
    c.evdbUrl,
    `${SITE_URL}${carHref(c)}`,
  ]);
  const note = `# Range figures: EV Database (ev-database.org), please credit them as the source. Compared by ${SITE_NAME} (${SITE_URL}/real-range-vs-wltp), updated ${UPDATED_ISO}.`;
  const body = [note, head, ...rows].map((r) => (Array.isArray(r) ? r.map(cell).join(",") : r)).join("\n") + "\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plainev-real-range-vs-wltp.csv"',
    },
  });
}
