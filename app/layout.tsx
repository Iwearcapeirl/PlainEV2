import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import Link from "next/link";
import { rankingPages, SECTIONS, shortLabel } from "@/lib/rankings";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

// One variable family; the width axis gives the expanded display style used for headings and figures.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  // Set NEXT_PUBLIC_SITE_URL in production so canonical and Open Graph URLs use your domain.
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Electric cars on sale in the UK, ranked by real-world range rather than WLTP.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a56c4",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={archivo.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <header className="bg-ink text-on-ink">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
            <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${SITE_NAME} home`}>
              <Logo />
              <span className="font-wide whitespace-nowrap text-[15px] font-semibold">{SITE_NAME}</span>
            </Link>
            <nav aria-label="Main" className="flex items-center gap-1 text-sm sm:gap-2">
              <Link href="/best" className="whitespace-nowrap rounded-lg px-2 py-2 font-medium text-on-ink/80 hover:text-on-ink sm:px-3">
                Rankings
              </Link>
              <Link
                href="/quiz"
                className="whitespace-nowrap rounded-lg bg-signal px-3 py-2 font-semibold text-signal-ink hover:brightness-95 sm:px-3.5"
              >
                Find your match
              </Link>
            </nav>
          </div>
        </header>

        <main className="px-4 pb-16 pt-8 sm:px-6 sm:pt-12">{children}</main>

        <footer className="border-t border-line bg-card">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
            <nav aria-label="Footer" className="grid gap-8 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="font-wide font-semibold">{SITE_NAME}</p>
                <ul className="mt-3 grid gap-2">
                  <li><Link href="/" className="text-muted hover:text-foreground">Home</Link></li>
                  <li><Link href="/quiz" className="text-muted hover:text-foreground">Find your match</Link></li>
                  <li><Link href="/best" className="text-muted hover:text-foreground">All rankings</Link></li>
                </ul>
              </div>
              {SECTIONS.map((s) => {
                const pages = rankingPages.filter((p) => s.kinds.includes(p.kind));
                if (!pages.length) return null;
                return (
                  <div key={s.title}>
                    <p className="font-semibold">{s.title}</p>
                    <ul className="mt-3 grid gap-2">
                      {pages.map((p) => (
                        <li key={p.slug}>
                          <Link href={`/best/${p.slug}`} className="text-muted hover:text-foreground">
                            {shortLabel(p)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </nav>
            <div className="mt-10 grid max-w-3xl gap-2 border-t border-line pt-6 text-xs leading-relaxed text-muted">
              <p>
                Data extracted 9 October 2026. Range is real-world range, not WLTP.
                UK prices are starting prices including VAT.
              </p>
              <p>
                Car photos come from Wikimedia Commons contributors under free licences, credited on each photo. Photos show the
                model, not always the exact trim or year listed.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

/** A charge-level mark: four bars, three lit in signal yellow. */
function Logo() {
  return (
    <svg viewBox="0 0 28 16" aria-hidden className="h-4 w-7">
      <rect x="0.5" y="0.5" width="24" height="15" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.5" />
      <rect x="25.5" y="5" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.5" />
      <rect x="3" y="3" width="4" height="10" rx="1" fill="var(--signal)" />
      <rect x="8.5" y="3" width="4" height="10" rx="1" fill="var(--signal)" />
      <rect x="14" y="3" width="4" height="10" rx="1" fill="var(--signal)" />
    </svg>
  );
}
