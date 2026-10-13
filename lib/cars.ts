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
