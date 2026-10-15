import type { Metadata } from "next";
import { Suspense } from "react";
import Browse from "@/components/Browse";

export const metadata: Metadata = {
  title: "All electric cars, new and used",
  description:
    "Browse every electric car you can buy new or second-hand in the UK, Germany or the Netherlands. Filter by price, range, body style, make and more, with real-world range, not WLTP.",
  alternates: { canonical: "/cars" },
};

export default function CarsPage() {
  return (
    <Suspense fallback={<p className="py-10 text-sm text-muted">Loading the cars…</p>}>
      <Browse />
    </Suspense>
  );
}
