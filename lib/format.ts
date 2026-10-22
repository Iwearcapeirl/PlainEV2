// The data is stored in metric units (km, Wh/km), as published by EV Database.
// Distances and efficiency are shown in miles by default, or km with the switch in the top bar: those formatters
// return both versions (lib/units.ts), so render them with u() from components/UnitText.tsx.
import { both } from "./units";

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

/** "311 mi" (or "500 km") — compact, for stat tiles. */
export const formatMi = (km: number) => both(`${int.format(kmToMiles(km))} mi`, `${int.format(km)} km`);
/** "311 miles" (or "500 km") — for running text. */
export const formatMiles = (km: number) => both(`${int.format(kmToMiles(km))} miles`, `${int.format(km)} km`);
/** The other unit, for the small line under a figure: "500 km" (or "311 mi" when showing km). */
export const formatKm = (km: number) => both(`${int.format(km)} km`, `${int.format(kmToMiles(km))} mi`);
/** "311 miles (500 km)" (or "500 km (311 miles)") — for running text. */
export const formatDistance = (km: number) =>
  both(`${int.format(kmToMiles(km))} miles (${int.format(km)} km)`, `${int.format(km)} km (${int.format(kmToMiles(km))} miles)`);

/** Wh/km → miles per kWh (higher is better). */
export const miPerKwh = (whPerKm: number) => 1000 / (whPerKm * KM_PER_MILE);
const miKwh = (whPerKm: number) => `${oneDp.format(miPerKwh(whPerKm))} mi/kWh`;
const kwh100 = (whPerKm: number) => `${oneDp.format(whPerKm / 10)} kWh/100 km`;
/** "4.1 mi/kWh" (or "15.1 kWh/100 km") */
export const formatMiPerKwh = (whPerKm: number) => both(miKwh(whPerKm), kwh100(whPerKm));
/** The other unit, under an efficiency figure: "151 Wh/km" (or "4.1 mi/kWh" when showing km). */
export const formatWhPerKm = (whPerKm: number) => both(`${int.format(whPerKm)} Wh/km`, miKwh(whPerKm));
/** "4.1 mi/kWh (151 Wh/km)" (or "15.1 kWh/100 km (4.1 mi/kWh)") — for running text. */
export const formatEfficiency = (whPerKm: number) =>
  both(`${miKwh(whPerKm)} (${int.format(whPerKm)} Wh/km)`, `${kwh100(whPerKm)} (${miKwh(whPerKm)})`);

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
