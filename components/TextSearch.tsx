"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { answersToQuery, type Answers } from "@/lib/quiz";
import { EMPTY_REFINEMENT, writeRefinement, type Refinement } from "@/lib/fields";
import { MAX_QUERY_LENGTH, answersFromText, refinementFromText } from "@/lib/understand";

const EXAMPLES = [
  "A 7-seater under £50k for family trips to Cornwall",
  "Cheap hatchback for a 20-mile commute",
  "SUV that does 300 miles, with a heat pump for cold winters",
  "All-wheel drive estate, around £45k",
];

/**
 * Describe-it search: the default way into the results. The description is sent to /api/understand,
 * which maps it onto the quiz's filters; if that route can't be reached, the built-in rules run here instead.
 */
export default function TextSearch({ initial = "", onUseQuiz }: { initial?: string; onUseQuiz: () => void }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) {
      setError("Describe the car you’re looking for, or answer the questions instead.");
      return;
    }
    setError(null);
    setBusy(true);
    let answers: Answers;
    let refinement: Refinement;
    try {
      const res = await fetch("/api/understand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      answers = data.answers;
      refinement = data.refinement ?? EMPTY_REFINEMENT;
      // Shows in the browser console why Claude wasn't used (e.g. "no_api_key"); the server log has the details.
      if (data.source === "rules") console.warn(`Search used the built-in rules instead of Claude (${data.reason ?? "unknown"}).`);
    } catch {
      answers = answersFromText(q);
      refinement = refinementFromText(q);
    }
    // Quiz answers, then any extra filters and sort (the results page's "Filter and sort" reads f=, sort= and dir=).
    const params = writeRefinement(new URLSearchParams(answersToQuery(answers)), refinement);
    params.set("q", q);
    router.push(`/results?${params}`);
  };

  return (
    <form onSubmit={submit} aria-busy={busy}>
      <label htmlFor="ev-search" className="font-wide block text-2xl font-semibold leading-tight sm:text-3xl">
        What are you looking for?
      </label>
      <p id="ev-search-hint" className="mt-2 text-muted text-pretty">
        Your budget, how far you drive, who you carry: whatever matters to you.
      </p>

      <textarea
        id="ev-search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Enter searches; Shift+Enter adds a new line.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
        maxLength={MAX_QUERY_LENGTH}
        rows={3}
        aria-describedby={`ev-search-hint${error ? " ev-search-error" : ""}`}
        aria-invalid={error ? true : undefined}
        placeholder="e.g. A family SUV under £40k that can get to Scotland with one charging stop"
        className="mt-5 block w-full resize-y rounded-2xl bg-card px-5 py-4 text-[17px] leading-relaxed shadow-[0_0_0_1px_var(--line),var(--sc-e1)] placeholder:text-muted/80 focus:shadow-[0_0_0_2px_var(--ink),var(--sc-e2)] focus:outline-none"
      />
      {error && (
        <p id="ev-search-error" role="alert" className="mt-2 text-sm font-medium text-[#b42318] dark:text-[#ff9b8f]">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-signal px-6 py-3.5 text-[15px] font-semibold text-signal-ink transition-[filter,transform] duration-150 hover:brightness-95 active:scale-[0.97] disabled:opacity-60"
        >
          {busy ? "Finding your matches…" : "Find my matches"}
        </button>
        <button
          type="button"
          onClick={onUseQuiz}
          className="rounded-xl bg-card px-6 py-3.5 text-[15px] font-semibold shadow-[0_0_0_1px_var(--line)] transition-shadow duration-150 hover:shadow-[0_0_0_1.5px_var(--foreground)]"
        >
          Answer questions instead
        </button>
      </div>

      <div className="mt-8">
        <p className="text-sm text-muted">Not sure how to put it? Try one of these:</p>
        <ul className="mt-2.5 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <li key={ex}>
              <button
                type="button"
                onClick={() => {
                  setText(ex);
                  setError(null);
                  document.getElementById("ev-search")?.focus();
                }}
                className="rounded-full bg-accent-soft px-3.5 py-2 text-left text-sm text-foreground/85 transition-colors hover:bg-ink hover:text-on-ink"
              >
                {ex}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
