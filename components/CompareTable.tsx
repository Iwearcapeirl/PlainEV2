import type { Cell, CompareTable as Table } from "@/lib/compare";

/** The columns of the slots and the table: a label column on wider screens, then one per car. */
export const COLS =
  "grid grid-cols-3 gap-x-2 sm:grid-cols-[11rem_repeat(3,minmax(0,1fr))] sm:gap-x-3 lg:grid-cols-[13rem_repeat(3,minmax(0,1fr))]";
/** The same for two cars (the vs pages). */
export const COLS_2 = "grid grid-cols-2 gap-x-3 sm:grid-cols-[13rem_repeat(2,minmax(0,1fr))] sm:gap-x-4";

/**
 * The comparison rows, grouped like the car pages, with the best in each row marked green. Used by the Compare page
 * (client) and the "X vs Y" pages (server), so it has no state of its own.
 */
export default function CompareRows({ table, cols = COLS }: { table: Table; cols?: string }) {
  const n = table.tally.wins.length;
  return (
    <>
      {table.groups.map((g) => (
        <div key={g.title} className="mt-6">
          <h2 className="font-wide text-lg font-semibold">{g.title}</h2>
          <dl className="mt-2">
            {g.rows.map((r) => (
              <div key={r.key} className={`${cols} border-t border-line py-1.5 sm:py-2`}>
                <dt className={`pt-1 text-xs font-medium text-muted sm:col-span-1 sm:pt-1.5 sm:text-sm ${n === 2 ? "col-span-2" : "col-span-3"}`}>{r.label}</dt>
                {r.cells.map((cell, i) => (
                  <Value key={i} cell={cell} win={r.wins[i]} />
                ))}
              </div>
            ))}
          </dl>
        </div>
      ))}
    </>
  );
}

function Value({ cell, win }: { cell: Cell | null; win: boolean }) {
  if (!cell) return <dd aria-hidden />;
  return (
    <dd className={`min-w-0 rounded-md px-1.5 py-1 sm:px-2 ${win ? "bg-win shadow-[inset_0_0_0_1px_var(--route)]" : ""}`}>
      <span className="flex items-start gap-1 text-[13px] font-semibold leading-snug tabular-nums break-words sm:text-[15px]">
        {win && (
          <span aria-hidden className="text-route">
            ✓
          </span>
        )}
        <span className="min-w-0">{cell.text}</span>
        {win && <span className="sr-only"> (best)</span>}
      </span>
      {cell.sub && <span className="block text-[11px] leading-snug text-muted sm:text-xs">{cell.sub}</span>}
    </dd>
  );
}
