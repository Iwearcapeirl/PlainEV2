import { Fragment, type ReactNode } from "react";
import { hasUnits, UNITS_RE } from "@/lib/units";

/**
 * Renders text that may hold miles/km pairs (lib/units.ts) as two spans; CSS in globals.css shows one of them.
 * Plain text passes through unchanged. No hooks, so it works in server and client components.
 */
export function u(text: string | null | undefined): ReactNode {
  if (!text || !hasUnits(text)) return text;
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(UNITS_RE)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push(
      <Fragment key={i++}>
        <span className="u-mi">{m[1]}</span>
        <span className="u-km">{m[2]}</span>
      </Fragment>,
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** The same as a component: <U>{text}</U> */
export default function U({ children }: { children: string | null | undefined }) {
  return <>{u(children)}</>;
}
