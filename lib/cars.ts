import raw from "@/data/cars.json";

/** Photo credit for a Wikimedia Commons image (all images are freely licensed and need attribution). */
export interface ImageCredit {
  author: string;
  license: string;
  licenseUrl: string;
  /** Commons file page */
  source: string;
  /** The model the photo shows (may be a different trim or year from the exact car). */
  subject: string;
}

/** A freely licensed interior photo from Wikimedia Commons. `subject` says what the photo shows. */
export interface InteriorPhoto extends ImageCredit {
  /** 960px-wide Wikimedia thumbnail */
  image: string;
  /** Original dimensions (used for the aspect ratio) */
  width: number;
  height: number;
}

/** Shape of each record in data/cars.json (field names as exported from the spreadsheet). */
interface RawCar {
  ID: number;
  Make: string;
  Model: string;
  "Full name": string;
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
  "Price UK GBP": number;
  URL: string;
  image: string | null;
  imageCredit: ImageCredit | null;
  interiors: InteriorPhoto[];
  family: string;
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
  /** Sales status (every car on the site is "Available"). */
  status: string;
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
  priceGbp: number;
  url: string;
  /** 960px-wide Wikimedia thumbnail, or null when no suitable free photo exists. */
  image: string | null;
  imageCredit: ImageCredit | null;
  /** Interior photos (0–2); empty when no suitable free photo exists. */
  interiors: InteriorPhoto[];
  /** Model family shared by all versions of a model, e.g. "Hyundai Ioniq 5". */
  family: string;
  /** URL slug for the car's page: /car/{slug} */
  slug: string;
}

function toCar(r: RawCar): Car {
  return {
    id: r.ID,
    make: r.Make,
    model: r.Model,
    fullName: r["Full name"],
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
    status: r.Status,
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
    url: r.URL,
    image: r.image,
    imageCredit: r.imageCredit,
    interiors: r.interiors ?? [],
    family: r.family,
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

/** All available cars with a UK price (pre-filtered when cars.json was built). */
export const cars: Car[] = (() => {
  const list = (raw as unknown as RawCar[]).map(toCar);
  // Slugs are make + model. If two versions ever share one, both get the EV Database ID appended so URLs stay unique.
  const seen = new Map<string, number>();
  for (const c of list) seen.set(c.slug, (seen.get(c.slug) ?? 0) + 1);
  for (const c of list) if (seen.get(c.slug)! > 1) c.slug = `${c.slug}-${c.id}`;
  return list;
})();

/** The page for one car. */
export const carHref = (car: Pick<Car, "slug">) => `/car/${car.slug}`;
