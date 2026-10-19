import type { ReactNode } from "react";
import type { Car } from "@/lib/cars";

/** EV Database's homepage, for page-level credits where no single car is meant. */
export const EVDB_HOME = "https://ev-database.org/uk/";

/**
 * A link to this car's page on EV Database, where the figures come from. Their terms ask for a visible, working link
 * to the car's own page wherever its data is shown. Opens in a new tab; the referrer is kept so they can see the visits.
 */
export default function EvdbLink({ car, className = "", children }: { car: Pick<Car, "evdbUrl">; className?: string; children: ReactNode }) {
  return (
    <a href={car.evdbUrl} target="_blank" rel="noopener" className={className}>
      {children}
      <span aria-hidden> ↗</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** One line for pages that list many cars: where the figures come from, and where the per-car links are. */
export function DataSourceNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted ${className}`}>
      Car data from{" "}
      <a href={EVDB_HOME} target="_blank" rel="noopener" className="underline decoration-line underline-offset-2 hover:text-foreground">
        EV Database
      </a>
      . Each car&rsquo;s page links to its own entry there.
    </p>
  );
}
