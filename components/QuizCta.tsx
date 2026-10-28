import Link from "next/link";

/** Prominent call to action linking to the quiz. */
export default function QuizCta({ compact = false }: { compact?: boolean }) {
  return (
    <aside
      className={`flex flex-col gap-4 rounded-2xl bg-ink text-on-ink sm:flex-row sm:items-center sm:justify-between ${
        compact ? "px-5 py-4" : "px-6 py-6 sm:px-7"
      }`}
    >
      <div>
        <p className={`font-wide font-semibold ${compact ? "text-base" : "text-xl"}`}>Not sure which one is right for you?</p>
        <p className="mt-1 text-sm text-on-ink/85">Answer five quick questions to get your personal top 5, new or used.</p>
      </div>
      <Link
        href="/quiz"
        className="shrink-0 rounded-xl bg-signal px-5 py-3 text-center text-sm font-semibold text-signal-ink hover:brightness-95"
      >
        Find your match
      </Link>
    </aside>
  );
}
