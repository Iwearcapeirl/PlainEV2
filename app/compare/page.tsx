import type { Metadata } from "next";
import { Suspense } from "react";
import Compare from "@/components/Compare";

export const metadata: Metadata = {
  title: "Compare electric cars side by side",
  description:
    "Compare up to three electric cars side by side: real-world range, charging, battery, boot space, price new and used, and more, with the best in each row marked.",
  alternates: { canonical: "/compare" },
  // Every combination of cars is its own URL, so keep comparisons out of search results (links are still followed).
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return (
    <Suspense fallback={<p className="py-10 text-sm text-muted">Loading the comparison…</p>}>
      <Compare />
    </Suspense>
  );
}
