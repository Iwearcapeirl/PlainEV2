import data from "@/data/cars.min.json";

/** Photo credit for a Wikimedia Commons image (all images are freely licensed and need attribution). */
export interface ImageCredit {
  author: string;
  license: string;
  licenseUrl: string;
  /** Commons file page */
  source: string;
  /** The model the photo shows (may be a different trim or year from the exact car). */
  subject: string;
  /** Set when the photo isn't of this exact car, e.g. "Photo shows the Bentley Bentayga, not this car." */
  note?: string;
}

/** A freely licensed interior photo from Wikimedia Commons. `subject` says what the photo shows. */
export interface InteriorPhoto extends ImageCredit {
  /** 960px-wide Wikimedia thumbnail */
  image: string;
  /** Original dimensions (used for the aspect ratio) */
  width: number;
  height: number;
}

/**
 * Shape of each record in data/cars.json (field names as exported from the spreadsheet). The browser loads the
 * compact copy, data/cars.min.json (same fields as columns + rows, without interior photos and source links;
 * those are in data/car-extras.json for car pages, see lib/carExtras.ts).
 */
interface RawCar {
  ID: number;
  Make: string;
  Model: string;
  Body: string;
  Drive: string;
  Seats: number;
  "Heat pump": boolean;
  V2L: boolean;
  "Battery chemistry": string | null;
  "Real range km": number;
  "Efficiency Wh/km": number;
  "1-stop range km": number;
  "Usable battery kWh": number;
  "Fastcharge kW": number;
  "0-100 km/h s": number;
  Status: string;
  Availability: string;
  "Available from": string;
  "Available to": string | null;
  "Year from": number;
  "Year to": number | null;
  Segment: string;
  "Towbar possible": boolean;
  "Euro NCAP stars": number | null;
  V2H: boolean;
  V2G: boolean;
  "AC charge kW": number;
  "Charge plug": string;
  "Range estimated": boolean;
  "Efficiency estimated": boolean;
  "Weight kg": number;
  "Battery estimated": boolean;
  "Towing kg": number;
  "Cargo L": number;
  "Price/km estimated": boolean;
  "Price Germany EUR": number | null;
  "Price Netherlands EUR": number | null;
  "Price per km EUR": number;
  "Price UK GBP": number | null;
  image: string | null;
  imageCredit: ImageCredit | null;
  family: string;
  /** Model name without model-year tags, e.g. "IONIQ 5 Long Range 2WD" */
  variant: string;
}

export interface Car {
  id: number;
  make: string;
  model: string;
  fullName: string;
  body: string;
  drive: string;
  seats: number;
  heatPump: boolean;
  v2l: boolean;
  chemistry: string | null;
  rangeKm: number;
  whPerKm: number;
  oneStopKm: number;
  batteryKwh: number;
  fastchargeKw: number;
  /** 0–100 km/h in seconds (the same as 0–62 mph). */
  accelS: number;
  /** "Available" (on sale new), "Discontinued" (no longer sold new) or "Upcoming" (not on sale yet). */
  status: "Available" | "Discontinued" | "Upcoming";
  /** e.g. "Available to order since April 2026" */
  availability: string;
  /** ISO dates: when orders opened, and when sales end (null when no end date is announced). */
  availableFrom: string;
  availableTo: string | null;
  /** First (and, if announced, last) model year. */
  yearFrom: number;
  yearTo: number | null;
  /** Size class: A city car … F luxury, N van-based people carrier, S sports car. */
  segment: string;
  towbar: boolean;
  /** Maximum braked towing weight; 0 means not approved for towing. */
  towingKg: number;
  /** Boot space in litres. */
  cargoL: number;
  weightKg: number;
  /** null when the car hasn't been tested. */
  ncapStars: number | null;
  v2h: boolean;
  v2g: boolean;
  /** Maximum AC (home or destination) charging power. */
  acChargeKw: number;
  chargePlug: string;
  /** Whether each figure is an estimate rather than a confirmed one. */
  rangeEstimated: boolean;
  efficiencyEstimated: boolean;
  batteryEstimated: boolean;
  pricePerKmEstimated: boolean;
  priceDeEur: number | null;
  priceNlEur: number | null;
  pricePerKmEur: number;
  /** UK price new (current, or last price when it was sold new); null when it was never sold in the UK. */
  priceGbp: number | null;
  /** 960px-wide Wikimedia thumbnail, or null when no suitable free photo exists. */
  image: string | null;
  imageCredit: ImageCredit | null;
  /** Model family shared by all versions of a model, across years and generations, e.g. "Hyundai Ioniq 5". */
  family: string;
  /** Model name without model-year tags; the same version sold across several years shares it. */
  variant: string;
  /** URL slug for the car's page: /car/{slug} */
  slug: string;
}

function toCar(r: RawCar): Car {
  return {
    id: r.ID,
    make: r.Make,
    model: r.Model,
    fullName: `${r.Make} ${r.Model}`,
    body: r.Body,
    drive: r.Drive,
    seats: r.Seats,
    heatPump: r["Heat pump"],
    v2l: r.V2L,
    chemistry: r["Battery chemistry"],
    rangeKm: r["Real range km"],
    whPerKm: r["Efficiency Wh/km"],
    oneStopKm: r["1-stop range km"],
    batteryKwh: r["Usable battery kWh"],
    fastchargeKw: r["Fastcharge kW"],
    accelS: r["0-100 km/h s"],
    status: r.Status as Car["status"],
    availability: r.Availability,
    availableFrom: r["Available from"],
    availableTo: r["Available to"],
    yearFrom: r["Year from"],
    yearTo: r["Year to"],
    segment: r.Segment,
    towbar: r["Towbar possible"],
    towingKg: r["Towing kg"],
    cargoL: r["Cargo L"],
    weightKg: r["Weight kg"],
    ncapStars: r["Euro NCAP stars"],
    v2h: r.V2H,
    v2g: r.V2G,
    acChargeKw: r["AC charge kW"],
    chargePlug: r["Charge plug"],
    rangeEstimated: r["Range estimated"],
    efficiencyEstimated: r["Efficiency estimated"],
    batteryEstimated: r["Battery estimated"],
    pricePerKmEstimated: r["Price/km estimated"],
    priceDeEur: r["Price Germany EUR"],
    priceNlEur: r["Price Netherlands EUR"],
    pricePerKmEur: r["Price per km EUR"],
    priceGbp: r["Price UK GBP"],
    image: r.image,
    imageCredit: r.imageCredit,
    family: r.family,
    variant: r.variant,
    slug: slugify(`${r.Make} ${r.Model}`),
  };
}

/** "Mercedes-Benz EQS 450+ (MY26)" → "mercedes-benz-eqs-450-plus-my26" */
export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A car on sale new in the UK: the set the rankings, homepage and comparisons use. */
export type UkCar = Car & { priceGbp: number };

/** Every car in the data: on sale, discontinued and upcoming, in any country. Longest real-world range first. */
export const allCars: Car[] = (() => {
  const { columns, credits, rows } = data as { columns: string[]; credits: ImageCredit[]; rows: unknown[][] };
  const list = rows.map((row) => {
    const r = Object.fromEntries(columns.map((k, i) => [k, row[i]])) as Record<string, unknown>;
    if (typeof r.imageCredit === "number") r.imageCredit = credits[r.imageCredit];
    return toCar(r as unknown as RawCar);
  });

  // Slugs are make + model. Cars on sale in the UK claim theirs first, so their existing URLs never change; then
  // other cars on sale, discontinued and upcoming ones. A later car whose slug is taken gets its years added
  // ("-2019-2022"), and the EV Database ID if that's still not unique.
  const rank = (c: Car) => (c.status === "Available" ? (c.priceGbp !== null ? 0 : 1) : c.status === "Discontinued" ? 2 : 3);
  const order = [...list].sort((x, y) => rank(x) - rank(y));
  // Within the UK on-sale set, names shared by two versions keep the old rule (both get the ID), as before.
  const ukCount = new Map<string, number>();
  for (const c of order) if (rank(c) === 0) ukCount.set(c.slug, (ukCount.get(c.slug) ?? 0) + 1);
  const taken = new Set<string>();
  for (const c of order) {
    let slug = c.slug;
    if (rank(c) === 0 && ukCount.get(slug)! > 1) slug = `${slug}-${c.id}`;
    else if (taken.has(slug)) {
      slug = `${c.slug}-${c.yearFrom}-${c.yearTo ?? "on"}`;
      if (taken.has(slug)) slug = `${c.slug}-${c.id}`;
    }
    c.slug = slug;
    taken.add(slug);
  }
  return list;
})();

/** Cars on sale new in the UK (with a UK price), longest range first. */
export const cars: UkCar[] = allCars.filter((c): c is UkCar => c.status === "Available" && c.priceGbp !== null);

/** The page for one car. */
export const carHref = (car: Pick<Car, "slug">) => `/car/${car.slug}`;
