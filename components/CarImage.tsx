"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImageCredit } from "@/lib/cars";
import { photoSubject } from "@/lib/photo";

/**
 * Car photo in a fixed frame (no layout shift), lazy-loaded by default. The whole photo is always shown (never
 * cropped); if its shape differs from the frame, the spare space is filled with a blurred copy of the same photo.
 * Images are Wikimedia Commons thumbnails: small screens get the 500px version (~60 KB), larger ones the 960px one.
 * If there is no photo, or it fails to load, a placeholder with the make is shown instead.
 *
 * Tapping the photo opens it full-screen (PhotoViewer below) at 1280px, with its credit. Pass `gallery` to step
 * through several photos there (a car page's exterior and interior shots).
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
  gallery,
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
  /** Photos to step through in the full-screen viewer (this one must be among them); defaults to just this photo. */
  gallery?: ViewerPhoto[];
}) {
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
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

      {/* Above any link stretched over a card or row, so tapping the photo enlarges it instead of opening the car. */}
      {show && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Enlarge photo: ${alt ?? (credit ? photoSubject(credit) : `${make} ${model}`)}`}
          className="group/zoom absolute inset-0 z-10 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-foreground"
        >
          <span aria-hidden className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-ink/60 text-on-ink opacity-80 transition-opacity group-hover/zoom:opacity-100">
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9" />
            </svg>
          </span>
        </button>
      )}
      {open && show && (
        <PhotoViewer
          photos={gallery?.length ? gallery : [{ src: src!, credit, alt: alt ?? (credit ? photoSubject(credit) : `${make} ${model}`) }]}
          start={Math.max(0, gallery?.findIndex((g) => g.src === src) ?? 0)}
          onClose={() => setOpen(false)}
        />
      )}

      {show && credit && caption && (
        <figcaption className="pointer-events-none absolute inset-x-2 bottom-2 z-20 flex flex-col items-end gap-1 text-[10px] leading-tight text-on-ink/90 [&_a]:pointer-events-auto">
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

export interface ViewerPhoto {
  src: string;
  credit: ImageCredit | null;
  alt: string;
}

/** Wikimedia's 1280px thumbnail of the same photo (falls back to the 960px one if that size doesn't exist). */
const large = (src: string) => src.replace("/960px-", "/1280px-");

/**
 * Full-screen photo viewer: a native modal dialog (focus is kept inside, Esc closes it). Close with ✕, Esc, a tap
 * outside the photo or a swipe down; step through several photos with the arrows, arrow keys or a sideways swipe.
 */
function PhotoViewer({ photos, start, onClose }: { photos: ViewerPhoto[]; start: number; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(start);
  const [fallback, setFallback] = useState<Record<number, boolean>>({});
  const touch = useRef<{ x: number; y: number } | null>(null);
  const p = photos[i];
  const many = photos.length > 1;
  const go = useCallback((d: number) => setI((x) => (x + d + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.showModal();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      if (el.open) el.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (many && e.key === "ArrowRight") go(1);
        if (many && e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const t = touch.current;
        touch.current = null;
        if (!t) return;
        const dx = e.changedTouches[0].clientX - t.x;
        const dy = e.changedTouches[0].clientY - t.y;
        if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose();
        else if (many && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      }}
      aria-label="Photo"
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-white backdrop:bg-black/90"
    >
      <div className="flex h-full flex-col" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
          <p className="text-sm text-on-ink/80" aria-live="polite">
            {many ? `${i + 1} of ${photos.length}` : ""}
          </p>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Close photo"
            className="grid size-10 place-items-center rounded-full bg-on-ink/15 text-xl leading-none hover:bg-on-ink/25"
          >
            ✕
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16" onClick={(e) => e.target === e.currentTarget && onClose()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={p.src}
            src={fallback[i] ? p.src : large(p.src)}
            alt={p.alt}
            referrerPolicy="no-referrer"
            onError={() => setFallback((f) => (f[i] ? f : { ...f, [i]: true }))}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
          {many && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ink/60 text-2xl hover:bg-ink/80 sm:left-4">
                ‹
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-ink/60 text-2xl hover:bg-ink/80 sm:right-4">
                ›
              </button>
            </>
          )}
        </div>

        <div className="p-3 text-center text-xs text-on-ink/80 sm:p-4">
          <p className="font-medium text-on-ink">{p.alt}</p>
          {p.credit?.note && <p className="mt-1">{p.credit.note}</p>}
          {p.credit && (
            <p className="mt-1">
              <a href={p.credit.source} target="_blank" rel="noopener noreferrer" className="underline decoration-on-ink/40 underline-offset-2">
                Photo: {p.credit.author}
              </a>
              {", "}
              <a href={p.credit.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline decoration-on-ink/40 underline-offset-2">
                {p.credit.license}
              </a>
              , Wikimedia Commons
            </p>
          )}
        </div>
      </div>
    </dialog>
  );
}
