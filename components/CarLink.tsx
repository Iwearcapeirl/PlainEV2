"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The list a visitor opened a car from, so the car page can offer "Back to your results" (or the ranking) without
 * putting the whole quiz query into the car's URL. Kept per tab in sessionStorage; the car page works without it.
 */
export interface ReturnTo {
  href: string;
  label: string;
}

const KEY = "fme:return-to";

export function saveReturnTo(label: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ href: location.pathname + location.search, label } satisfies ReturnTo));
  } catch {
    // Storage blocked (private mode etc.): the car page falls back to its normal breadcrumb.
  }
}

export function readReturnTo(): ReturnTo | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    // Only ever link back to our own list pages.
    if (v && typeof v.href === "string" && typeof v.label === "string" && /^\/(results|cars|compare|running-costs|best\/[a-z0-9-]+|best)?(\?|$)/.test(v.href)) return v;
  } catch {}
  return null;
}

/** A link to a car page that remembers where the visitor came from. */
export default function CarLink({
  href,
  returnLabel,
  className,
  children,
}: {
  href: string;
  /** How the car page should describe this list, e.g. "your results". */
  returnLabel: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => saveReturnTo(returnLabel)}>
      {children}
    </Link>
  );
}
