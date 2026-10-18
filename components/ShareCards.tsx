import { allCars, type Car } from "@/lib/cars";
import { homeCountry } from "@/lib/carProfile";
import { formatMi } from "@/lib/format";
import { formatMoney, newPrice, usedFrom } from "@/lib/market";

/**
 * Share-image designs (1200×630), drawn by app/api/og/[kind]/[slug]/route.tsx with next/og. Only inline styles and
 * the flexbox subset of CSS work there: every element with more than one child needs display: flex.
 */

export const W = 1200;
export const H = 630;
const BLUE = "#1a56c4";
const DEEP = "#14233f";
const YELLOW = "#ffd02e";

/** The price line: new price where it's on sale, otherwise the cheapest used estimate. */
function priceLine(car: Car): string | null {
  const country = homeCountry(car);
  if (!country) return null;
  const p = newPrice(car, country);
  if (car.status === "Available" && p !== null) return `From ${formatMoney(p, country)} new`;
  const u = usedFrom(car, country);
  if (u) return `Used from about ${formatMoney(u.low, country)}`;
  return p !== null ? `${car.status === "Upcoming" ? "Expected" : "Was"} ${formatMoney(p, country)}` : null;
}

function Logo({ size = 1 }: { size?: number }) {
  const s = (n: number) => n * size;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: s(14) }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            gap: s(4),
            padding: s(4),
            width: s(52),
            height: s(30),
            border: `${s(3)}px solid rgba(255,255,255,0.85)`,
            borderRadius: s(6),
          }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ flex: 1, background: YELLOW, borderRadius: s(2) }} />
          ))}
        </div>
        <div style={{ width: s(4), height: s(12), background: "rgba(255,255,255,0.85)", borderRadius: s(2) }} />
      </div>
      <div style={{ fontSize: s(30), fontWeight: 700, color: "white" }}>PlainEV</div>
    </div>
  );
}

function Footer({ right }: { right?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
      <Logo />
      <div style={{ fontSize: 24, color: "rgba(255,255,255,0.75)" }}>{right ?? "plainev.com · real-world range, not WLTP"}</div>
    </div>
  );
}

function Photo({ src, width, height }: { src: string | null; width: number; height: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={width} height={height} style={{ width, height, objectFit: "cover" }} alt="" />
  ) : (
    <div style={{ display: "flex", width, height, background: "rgba(255,255,255,0.12)" }} />
  );
}

export function CarCard({ car, photo }: { car: Car; photo: string | null }) {
  const price = priceLine(car);
  return (
    <div style={{ display: "flex", width: W, height: H, background: BLUE, color: "white" }}>
      <Photo src={photo} width={560} height={H} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "52px 56px 44px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, color: "rgba(255,255,255,0.8)" }}>{car.make}</div>
          <div style={{ fontSize: car.variant.length > 28 ? 44 : 54, fontWeight: 700, lineHeight: 1.05, marginTop: 6 }}>{car.variant}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
            <div style={{ fontSize: 96, fontWeight: 700, color: YELLOW, lineHeight: 1 }}>{String(Math.round(car.rangeKm / 1.609344))}</div>
            <div style={{ fontSize: 32, fontWeight: 700, paddingBottom: 10 }}>miles real-world range</div>
          </div>
          {price && <div style={{ fontSize: 34, marginTop: 14 }}>{price}</div>}
        </div>
        <Footer right="plainev.com" />
      </div>
    </div>
  );
}

export function VsCard({ a, b, names, photos }: { a: Car; b: Car; names: [string, string]; photos: [string | null, string | null] }) {
  const side = (c: Car, name: string) => (
    <div style={{ display: "flex", flexDirection: "column", width: 520 }}>
      <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
      <div style={{ fontSize: 28, marginTop: 8, color: "rgba(255,255,255,0.85)" }}>
        {`${formatMi(c.rangeKm)} · ${priceLine(c) ?? ""}`}
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", width: W, height: H, background: BLUE, color: "white" }}>
      <div style={{ display: "flex", position: "relative" }}>
        <Photo src={photos[0]} width={600} height={330} />
        <Photo src={photos[1]} width={600} height={330} />
        <div
          style={{
            position: "absolute",
            left: 548,
            top: 113,
            width: 104,
            height: 104,
            borderRadius: 52,
            background: YELLOW,
            color: DEEP,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 700,
          }}
        >
          vs
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "30px 56px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {side(a, names[0])}
          {side(b, names[1])}
        </div>
        <Footer right="Which is better? Side by side on plainev.com" />
      </div>
    </div>
  );
}

export function ListCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div style={{ display: "flex", width: W, height: H, background: BLUE, color: "white" }}>
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "56px 64px 48px" }}>
      <div style={{ fontSize: title.length > 48 ? 52 : 60, fontWeight: 700, lineHeight: 1.08 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {lines.map((l, i) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 32 }}>
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 10, background: YELLOW, color: DEEP, fontWeight: 700 }}
            >
              {String(i + 1)}
            </div>
            <div style={{ display: "flex" }}>{l}</div>
          </div>
        ))}
      </div>
      <Footer />
    </div>
    </div>
  );
}

export function SiteCard() {
  const count = allCars.length.toLocaleString("en-GB");
  return (
    <div style={{ display: "flex", width: W, height: H, background: BLUE, color: "white" }}>
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "64px 72px 56px" }}>
      <Logo size={1.6} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.04 }}>Find the right electric car, new or used.</div>
        <div style={{ fontSize: 34, marginTop: 22, color: "rgba(255,255,255,0.85)" }}>
          {`Real-world range, honest used prices and warranties for ${count} electric cars, new and used.`}
        </div>
      </div>
      <div style={{ fontSize: 28, color: YELLOW, fontWeight: 700 }}>plainev.com</div>
    </div>
    </div>
  );
}
