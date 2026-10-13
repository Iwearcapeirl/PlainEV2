/**
 * Placeholder for a display ad.
 *
 * To switch on AdSense later, replace the inner placeholder with your <ins className="adsbygoogle" …> unit
 * (keyed by `slot`) and load the AdSense script once in app/layout.tsx.
 *
 * The space is reserved with a min-height so the layout doesn't shift when an ad loads. The dashed
 * outline and label only show in development (`npm run dev`); in production the slot renders as an
 * empty, invisible container until real ad code is added.
 */
const SHOW_PLACEHOLDER = process.env.NODE_ENV !== "production";

export default function AdSlot({ slot, className = "" }: { slot: string; className?: string }) {
  return (
    <div
      data-ad-slot={slot}
      role="complementary"
      aria-label="Advertisement"
      className={`ad-slot mx-auto w-full ${SHOW_PLACEHOLDER ? "min-h-[100px] sm:min-h-[90px]" : ""} ${className}`}
    >
      {SHOW_PLACEHOLDER && (
        <div className="grid h-full min-h-[inherit] place-items-center rounded-xl border border-dashed border-line text-[11px] uppercase tracking-wide text-muted">
          Ad placeholder: {slot}
        </div>
      )}
    </div>
  );
}
