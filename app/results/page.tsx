import type { Metadata } from "next";
import { Suspense } from "react";
import Results from "@/components/Results";

export const metadata: Metadata = {
  title: "Your matches",
  robots: { index: false, follow: true },
};

export default function ResultsPage() {
  return (
    <Suspense fallback={<p className="py-10 text-sm text-muted">Finding your matches…</p>}>
      <Results />
    </Suspense>
  );
}
