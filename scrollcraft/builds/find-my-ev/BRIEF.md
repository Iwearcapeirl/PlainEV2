# Find My EV: brief

Interviewed 12 October 2026 (two short rounds, multiple choice with free-text option).
The site already exists as a Next.js app; this build redesigns the homepage, quiz
and results inside it. Car pages and rankings keep their current design.

## The eight topics

1. **Vibe.** User chose: "Precision instrument". Dashboard and gauge feel: crisp
   numbers, dials that move as you scroll, technical and exact.
2. **Scroll journey.** Not given in their own words; authored below from the
   existing site and their other answers (marked as authored).
3. **Energy curve.** User chose: "Calm open, build to peak". Quiet hero, rising
   through the argument, loudest at the peak, steady close.
4. **Feeling and the one moment.** User chose "All three, one is the peak", then
   named the peak: **"No. 1 reveal (results)"**. The other two moments
   (range rings / radar on the homepage, 471 cars narrowing in the quiz) are
   lighter supporting moments.
5. **What no other site does.** Seeded by their pick of all three moments: one
   instrument (a range radar of every car on sale) that follows the visitor from
   homepage to quiz to results.
6. **Aesthetic range.** User chose: "Premium-minimal".
7. **One world or scenes.** User chose: "Distinct chapters".
8. **Assets.** User first chose "Generate photoreal imagery", then, told no
   kie.ai key is set, chose **"Build without it for now"**. So: existing
   Wikimedia car photos (credited) plus SVG/CSS drawn from the real data. No
   generated images, no video (ffmpeg is also missing).

## Subject, belief, action (from the existing site, not re-asked)

- **What / who:** a UK EV finder that ranks every electric car on sale by
  real-world range, not WLTP. For UK buyers choosing their first or next EV.
- **Believe by the end:** "This shows me what a car will really do on my roads,
  and which one fits me."
- **Next action:** take the quiz. One label: **"Find your match"** (header,
  hero, close).

## Journey (authored)

| # | Beat | What shifts |
|---|---|---|
| 1 | Recognition | "How far will it really go?" is their question too |
| 2 | Tension | Range varies hugely: typical car vs the longest |
| 3 | Turn | Every car on sale on one instrument; somewhere on it is theirs |
| 4 | Substance | The longest real ranges, on one fixed scale |
| 5 | Range | The rankings they can browse |
| 6 | Commitment | The first quiz question, already answerable |

Quiz: the same radar, thinning out with every answer.
Results: the radar converges on one car and opens into it (the peak).

## Feeling curve

| Act | Feeling | Caused by |
|---|---|---|
| Home 1 hero | Calm curiosity | A quiet dial; scrolling flies you through its bezel |
| Home 2 spread | Mild surprise | Two real numbers land: typical 258 mi, longest 447 mi |
| Home 3 radar | Wonder, then "where am I on this?" | A sweep arm lights all 471 cars at their real range |
| Home 4 longest | Reassurance | Plain bars on one scale; calm after the sweep |
| Home 5 rankings | Browsing ease | Lateral rail of readouts |
| Home 6 close | Readiness | The first question, with live counts, one tap away |
| Quiz | Focus, control | Each answer switches dots off; the count falls |
| Results peak | Arrival, delight | Everything goes dark except one point, which opens into your car |
| Results list | Confidence | Four runners-up, calm cards |

## The peak

> "I answered four questions, the whole map of cars went dark except one dot,
> and it opened up into my car."

Lives on `/results`, first act. Largest span on any page (2.8 viewport-heights).
The silence before it is the quiz itself: a light, quiet surface.

## Tell-someone sentence

**It's the site where every electric car on sale lights up on a radar, your
answers switch them off one by one, and the last one left glowing opens into
your car.**

## Authored silence

None. No empty viewports are intended; any reported dead scroll is a defect.

## Hard constraints from the brand/data

- Only real numbers. There is no WLTP figure in the data, so no WLTP number is
  ever shown or implied. Counters use median/maximum real range and real counts.
- All existing quiz logic, URL state, results, ad slots, car/ranking pages keep
  working unchanged.
