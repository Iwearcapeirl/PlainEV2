import { cars, type Car } from "./cars";
import { kmToMiles, milesToKm } from "./format";

/**
 * Geometry for the range radar: every car on sale as one point.
 * Distance from the centre is real-world range (rings every 100 miles, out to 500).
 * Angle is UK price rank, cheapest at the top and getting dearer clockwise, so the
 * cars spread evenly around the dial instead of bunching at the cheap end.
 */

export const RADAR_MAX_MILES = 500;
export const RADAR_RINGS = [100, 200, 300, 400, 500];
/** Degrees of dial used; the gap at the top separates the cheapest car from the dearest. */
const SWEEP_DEG = 330;
const START_DEG = -90 + (360 - SWEEP_DEG) / 2;

export interface RadarPoint {
  id: number;
  /** Position in a 0..1 box, centre at 0.5, 0.5. */
  x: number;
  y: number;
  /** Price rank as a share of the dial, 0 (cheapest) to 1 (dearest); drives the sweep. */
  a: number;
}

const radius = (km: number) => (Math.min(kmToMiles(km), RADAR_MAX_MILES) / RADAR_MAX_MILES) * 0.46;

/** Angle in degrees (0 = right, clockwise) for a share of the dial. */
export const radarAngle = (a: number) => START_DEG + a * SWEEP_DEG;

const byPrice = [...cars].sort((x, y) => x.priceGbp - y.priceGbp || x.id - y.id);

export const radarPoints: RadarPoint[] = byPrice.map((c, i) => {
  const a = byPrice.length > 1 ? i / (byPrice.length - 1) : 0;
  const t = (radarAngle(a) * Math.PI) / 180;
  const r = radius(c.rangeKm);
  return { id: c.id, x: 0.5 + Math.cos(t) * r, y: 0.5 + Math.sin(t) * r, a };
});

const pointById = new Map(radarPoints.map((p) => [p.id, p]));
export const radarPoint = (car: Pick<Car, "id">) => pointById.get(car.id)!;

/** Price ticks on the dial: where £30k, £40k, … fall in the price order. */
export const RADAR_PRICE_TICKS = [30_000, 40_000, 50_000, 70_000].map((gbp) => ({
  gbp,
  a: byPrice.filter((c) => c.priceGbp <= gbp).length / byPrice.length,
}));

/** Ring radius (0..0.46 of the box) for a distance in miles. */
export const radarRingRadius = (miles: number) => radius(milesToKm(miles));

export const cheapest = byPrice[0];
export const dearest = byPrice[byPrice.length - 1];
