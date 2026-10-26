"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readReturnTo, type ReturnTo } from "@/components/CarLink";

/**
 * Breadcrumb for a car page. Server-rendered as Home / {model} / {car} (or Home / Rankings / {car} for a model with a
 * single version); after hydration, if the visitor came from their quiz results or a ranking, the middle step and a
 * "Back to …" button point there instead.
 */
export default function CarBreadcrumb({ current, model }: { current: string; model?: { href: string; label: string } }) {
  const [from, setFrom] = useState<ReturnTo | null>(null);
  useEffect(() => setFrom(readReturnTo()), []);

  const fallback = model ?? { href: "/best", label: "Rankings" };
  const middle = from ?? fallback;
  const middleLabel = from ? capitalise(from.label) : fallback.label;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <nav aria-label="Breadcrumb" className="min-w-0 text-sm text-muted">
        <ol className="flex min-w-0 items-center gap-2">
          <li className="shrink-0">
            <Link href="/" className="hover:text-foreground">Home</Link>
          </li>
          <li aria-hidden>/</li>
          <li className="min-w-0 truncate">
            <Link href={middle.href} className="hover:text-foreground">{middleLabel}</Link>
          </li>
          {/* On phones the car name is left out: it is the page heading right below. */}
          <li aria-hidden className="max-sm:hidden">/</li>
          <li aria-current="page" className="min-w-0 truncate text-foreground max-sm:sr-only">{current}</li>
        </ol>
      </nav>
      {from && (
        <Link
          href={from.href}
          className="inline-flex items-center gap-1.5 rounded-xl bg-card px-3.5 py-2 text-sm font-semibold shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1.5px_var(--foreground)]"
        >
          <span aria-hidden>←</span> {backLabel(from.href)}
        </Link>
      )}
    </div>
  );
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Back to your results", "Back to all cars", "Back to the comparison" or "Back to the ranking". */
function backLabel(href: string): string {
  if (href.startsWith("/results")) return "Back to your results";
  if (href.startsWith("/cars")) return "Back to all cars";
  if (href.startsWith("/compare")) return "Back to the comparison";
  return "Back to the ranking";
}
