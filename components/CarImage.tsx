"use client";

import { useCallback, useState } from "react";
import type { ImageCredit } from "@/lib/cars";
import { photoSubject } from "@/lib/photo";

/**
 * Car photo in a fixed frame (no layout shift), lazy-loaded by default. The whole photo is always shown (never
 * cropped); if its shape differs from the frame, the spare space is filled with a blurred copy of the same photo.
 * Images are Wikimedia Commons thumbnails: small screens get the 500px version (~60 KB), larger ones the 960px one.
 * If there is no photo, or it fails to load, a placeholder with the make is shown instead.
 */
export default function CarImage({
  src,
  credit,
  make,
  model,
  priority = false,
  frameClass = "aspect-[16/9]",
  sizes = "(min-width: 640px) 500px, 100vw",
  alt,
  caption = true,
}: {
  src: string | null;
  credit: ImageCredit | null;
  make: string;
  model: string;
  /** Load immediately (use for the first card only, to help the largest-contentful-paint). */
  priority?: boolean;
  /** Size/aspect classes for the frame. */
  frameClass?: string;
  /** `sizes` attribute so the browser can pick the 500px or 960px file. */
  sizes?: string;
  /** Alt text (defaults to the model the photo shows). */
  alt?: string;
  /** Show the credit (and any "Photo shows…" note) on the photo. Small thumbnails turn it off and print it nearby. */
  caption?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(src) && !failed;
  // An image that errored before hydration never fires onError, so check its state when it mounts.
  const checkLoaded = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);

  return (
    <figure className={`relative overflow-hidden bg-accent-soft ${frameClass}`}>
      {show ? (
        <>
        {/* Soft, blurred copy of the same photo filling any space the photo itself doesn't (same file, so no extra download). */}
        <img
          aria-hidden
          alt=""
          src={src!}
          srcSet={`${src!.replace("/960px-", "/500px-")} 500w, ${src} 960w`}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-80 blur-xl brightness-90"
        />
        <img
          ref={checkLoaded}
          src={src!}
          srcSet={`${src!.replace("/960px-", "/500px-")} 500w, ${src} 960w`}
          sizes={sizes}
          width={960}
          height={540}
          alt={alt ?? (credit ? photoSubject(credit) : `${make} ${model}`)}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-contain"
        />
        </>
      ) : (
        <Placeholder make={make} model={model} />
      )}

      {show && credit && caption && (
        <figcaption className="absolute inset-x-2 bottom-2 z-10 flex flex-col items-end gap-1 text-[10px] leading-tight text-on-ink/90">
          {credit.note && <span className="max-w-full rounded bg-ink/80 px-1.5 py-0.5 text-right font-medium text-on-ink">{credit.note}</span>}
          <span className="max-w-[85%] truncate rounded bg-ink/70 px-1.5 py-0.5">
            <a href={credit.source} target="_blank" rel="noopener noreferrer" className="hover:underline">
              Photo: {credit.author}
            </a>
            {", "}
            <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer license" className="hover:underline">
              {credit.license}
            </a>
          </span>
        </figcaption>
      )}
    </figure>
  );
}

function Placeholder({ make, model }: { make: string; model: string }) {
  return (
    <div
      role="img"
      aria-label={`No photo available for the ${make} ${model}`}
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted"
    >
      <svg viewBox="0 0 64 24" aria-hidden className="h-7 w-[4.5rem] opacity-50" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17h3m10 0h30m10 0h3V13c0-1.5-1-2.6-2.5-2.9L50 9 42 4H22c-2 0-3.5.7-4.8 2L12 10l-5.5 1.2C5 11.5 4 12.6 4 14v3z" />
        <circle cx="12" cy="17" r="3.5" />
        <circle cx="52" cy="17" r="3.5" />
      </svg>
      <span className="font-wide px-4 text-center text-xs font-semibold">{make}</span>
      <span className="text-[11px]">Photo not available yet</span>
    </div>
  );
}
