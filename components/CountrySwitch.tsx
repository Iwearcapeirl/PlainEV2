"use client";

import { COUNTRIES, COUNTRY_IDS, type Country } from "@/lib/market";

/**
 * "Buying in: UK / Germany / Netherlands". Decides which cars are on offer (only ones sold in that country) and the
 * currency for prices and budgets. Used on the search, quiz and results.
 */
export default function CountrySwitch({
  value,
  onChange,
  className = "",
}: {
  value: Country;
  onChange: (country: Country) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Buying in" className={`flex flex-wrap items-center gap-2 text-sm ${className}`}>
      <span className="text-muted">Buying in</span>
      <span className="inline-flex rounded-lg bg-card p-1 shadow-[inset_0_0_0_1px_var(--line)]">
        {COUNTRY_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            onClick={() => onChange(id)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              value === id ? "bg-ink text-on-ink" : "text-muted hover:text-foreground"
            }`}
          >
            {COUNTRIES[id].label}
          </button>
        ))}
      </span>
    </div>
  );
}
