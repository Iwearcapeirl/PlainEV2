import type { ImageCredit } from "./cars";

/**
 * What a photo shows, for alt text: the note's subject when the photo isn't of this exact car ("the Bentley
 * Bentayga, not this car"), otherwise the model. Kept out of components/CarImage.tsx (a client component) so server
 * pages can call it too, and out of lib/cars.ts so the photo component doesn't pull in the car data.
 */
export function photoSubject(credit: ImageCredit): string {
  return credit.note ? credit.note.replace(/^Photo shows /, "").replace(/\.$/, "") : credit.subject;
}
