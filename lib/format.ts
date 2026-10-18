// The data is stored in metric units (km, Wh/km), as published by EV Database.
// Everything shown to UK readers leads with miles, with the metric equivalent in brackets.

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
const int = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const oneDp = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const KM_PER_MILE = 1.609344;

export const formatGbp = (n: number) => gbp.format(n);

/** km → whole miles. */
export const kmToMiles = (km: number) => Math.round(km / KM_PER_MILE);
/** miles → km (unrounded; used for filter thresholds). */
export const milesToKm = (miles: number) => miles * KM_PER_MILE;

/** "311 mi" — compact, for stat tiles. */
export const formatMi = (km: number) => `${int.format(kmToMiles(km))} mi`;
/** "500 km" */
export const formatKm = (km: number) => `${int.format(km)} km`;
/** "311 miles (500 km)" — for running text. */
export const formatDistance = (km: number) => `${int.format(kmToMiles(km))} miles (${formatKm(km)})`;

/** Wh/km → miles per kWh (higher is better). */
export const miPerKwh = (whPerKm: number) => 1000 / (whPerKm * KM_PER_MILE);
/** "4.1 mi/kWh" */
export const formatMiPerKwh = (whPerKm: number) => `${oneDp.format(miPerKwh(whPerKm))} mi/kWh`;
/** "151 Wh/km" */
export const formatWhPerKm = (whPerKm: number) => `${int.format(whPerKm)} Wh/km`;
/** "4.1 mi/kWh (151 Wh/km)" — for running text. */
export const formatEfficiency = (whPerKm: number) => `${formatMiPerKwh(whPerKm)} (${formatWhPerKm(whPerKm)})`;

/** UK price per mile of real-world range, e.g. "£172". */
export const formatGbpPerMile = (priceGbp: number, rangeKm: number) => gbp.format(priceGbp / (rangeKm / KM_PER_MILE));
/** UK price per km of real-world range, e.g. "£107". */
export const formatGbpPerKm = (priceGbp: number, rangeKm: number) => gbp.format(priceGbp / rangeKm);

/** "5.1 s" — 0–62 mph time (0–100 km/h is the same measure, so the figure is identical). */
export const formatAccel = (s: number) => `${oneDp.format(s)} s`;

/** mm → feet and inches, rounded to the nearest inch: 4635 → "15 ft 2 in". */
export function feetInches(mm: number): string {
  const totalIn = Math.round(mm / 25.4);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  return inch ? `${ft} ft ${inch} in` : `${ft} ft`;
}
/** mm → metres to 2 decimals: 4635 → "4.64 m" (rounded half up, as the filter compares). */
export const metres = (mm: number) => `${(Math.round(mm / 10) / 100).toFixed(2)} m`;
/** "4.64 m (15 ft 2 in)" */
export const formatSize = (mm: number) => `${metres(mm)} (${feetInches(mm)})`;
