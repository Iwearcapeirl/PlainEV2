import { cars, type Car } from "./cars";
import { formatDistance, formatEfficiency, formatGbp, formatGbpPerMile, formatMiPerKwh, KM_PER_MILE } from "./format";

/**
 * Everything the car page says about a car beyond the raw specs: where it ranks against the other EVs on sale,
 * and a short written summary. The write-up is generated from our own data (EV Database figures), because
 * EV Database's car pages are spec tables rather than reviews. It sticks to facts and comparisons.
 */

export const getCarBySlug = (slug: string) => cars.find((c) => c.slug === slug);

// ---------- Wording ----------

const BODY_NOUN: Record<string, [singular: string, plural: string]> = {
  SUV: ["SUV", "SUVs"],
  Hatchback: ["hatchback", "hatchbacks"],
  Sedan: ["saloon", "saloons"],
  Liftback: ["liftback", "liftbacks"],
  Station: ["estate", "estates"],
  MPV: ["MPV", "MPVs"],
  SPV: ["van-based people carrier", "van-based people carriers"],
  Cabrio: ["convertible", "convertibles"],
  Coupe: ["coupé", "coupés"],
};
export const bodyNoun = (body: string) => BODY_NOUN[body]?.[0] ?? body.toLowerCase();
export const bodyPlural = (body: string) => BODY_NOUN[body]?.[1] ?? `${body.toLowerCase()}s`;
/** Label for spec tables ("Estate" rather than EV Database's "Station"). */
export const bodyLabel = (body: string) => {
  const n = bodyNoun(body);
  return n === "SUV" || n === "MPV" ? n : n[0].toUpperCase() + n.slice(1);
};

export const driveLabel = (drive: string) =>
  ({ "Front Wheel Drive": "Front-wheel drive", "Rear Wheel Drive": "Rear-wheel drive", "All Wheel Drive": "All-wheel drive" })[drive] ??
  drive;

export const CHEMISTRY_LABEL: Record<string, string> = {
  LFP: "LFP (lithium iron phosphate)",
  NCM: "NCM (nickel manganese cobalt)",
};

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const peersShorter = (car: Car, peers: Car[]) => peers.some((c) => c.rangeKm < car.rangeKm);

const pricePerMile = (c: Car) => c.priceGbp / (c.rangeKm / KM_PER_MILE);

// ---------- Comparisons ----------

export interface Standing {
  /** 1 = best */
  rank: number;
  of: number;
}

/** Rank by a metric where higher is better (ties share the better rank). */
function standing(car: Car, pool: Car[], value: (c: Car) => number, higherIsBetter = true): Standing {
  const v = value(car);
  const better = pool.filter((c) => (higherIsBetter ? value(c) > v : value(c) < v)).length;
  return { rank: better + 1, of: pool.length };
}

export function carStandings(car: Car) {
  const peers = cars.filter((c) => c.body === car.body);
  return {
    peers,
    range: standing(car, cars, (c) => c.rangeKm),
    rangeInBody: standing(car, peers, (c) => c.rangeKm),
    efficiency: standing(car, cars, (c) => c.whPerKm, false),
    charging: standing(car, cars, (c) => c.fastchargeKw),
    /** Share of all EVs on sale with a shorter real-world range (0–100). */
    rangeBeatsPct: Math.round((cars.filter((c) => c.rangeKm < car.rangeKm).length / cars.length) * 100),
    medianWhPerKm: median(cars.map((c) => c.whPerKm)),
    medianPricePerMileInBody: median(peers.map(pricePerMile)),
  };
}

// ---------- Related cars ----------

/** Other versions of the same model, longest range first. */
export const otherVersions = (car: Car) =>
  cars.filter((c) => c.family === car.family && c.id !== car.id).sort((a, b) => b.rangeKm - a.rangeKm);

/**
 * Alternatives worth a look: same body style, a different model, priced within about 20% either way,
 * closest in price first; one version per model.
 */
export function similarCars(car: Car, count = 3): Car[] {
  const candidates = cars
    .filter((c) => c.body === car.body && c.family !== car.family && Math.abs(c.priceGbp - car.priceGbp) <= car.priceGbp * 0.2)
    .sort((a, b) => b.rangeKm - a.rangeKm);
  const byFamily = new Map<string, Car>();
  for (const c of candidates) if (!byFamily.has(c.family)) byFamily.set(c.family, c); // longest-range version of each model
  return [...byFamily.values()]
    .sort((a, b) => Math.abs(a.priceGbp - car.priceGbp) - Math.abs(b.priceGbp - car.priceGbp))
    .slice(0, count)
    .sort((a, b) => b.rangeKm - a.rangeKm);
}

// ---------- Write-up ----------

/** "quicker than 80% of the EVs on sale", "slower than most EVs on sale" etc. */
function accelCompare(car: Car): string {
  const slower = cars.filter((c) => c.accelS > car.accelS).length;
  const quicker = cars.filter((c) => c.accelS < car.accelS).length;
  if (quicker === 0) return "the quickest of the electric cars on sale in the UK";
  if (slower === 0) return "the slowest of the electric cars on sale in the UK";
  const pct = Math.round((slower / cars.length) * 100);
  return pct >= 50
    ? `quicker than ${pct}% of the electric cars on sale in the UK`
    : `slower than ${Math.round((quicker / cars.length) * 100)}% of the electric cars on sale in the UK`;
}

/** A short, neutral summary in plain paragraphs, built only from the data. */
export function carSummary(car: Car): string[] {
  const s = carStandings(car);
  const name = `${car.make} ${car.model}`;
  const total = cars.length;

  const intro =
    `The ${name} is a ${car.seats}-seat ${bodyNoun(car.body)} with ${driveLabel(car.drive).toLowerCase()}, ` +
    `on sale in the UK from ${formatGbp(car.priceGbp)}. ` +
    `It accelerates from 0 to 62 mph in ${car.accelS.toFixed(1)} seconds, ${accelCompare(car)}.`;

  const tied = cars.filter((c) => c.rangeKm === car.rangeKm).length > 1;
  const joint = tied ? "joint " : "";
  const shorter = cars.filter((c) => c.rangeKm < car.rangeKm).length;
  const rangeCompare =
    s.range.rank === 1
      ? `That is the ${joint}longest of the ${total} electric cars on sale in the UK`
      : s.range.rank <= 10
        ? `That puts it ${joint}${ordinal(s.range.rank)} of the ${total} electric cars on sale in the UK for range`
        : shorter === 0
          ? `That is the ${joint}shortest of the ${total} electric cars on sale in the UK`
          : s.rangeBeatsPct < 10
            ? `That puts it among the shortest-range 10% of the ${total} electric cars on sale in the UK`
            : `That is longer than ${s.rangeBeatsPct}% of the ${total} electric cars on sale in the UK`;
  const b = s.rangeInBody;
  const inBody =
    b.of === 1
      ? `it is the only ${bodyNoun(car.body)} listed`
      : b.rank === 1
        ? `the longest of ${b.of} ${bodyPlural(car.body)}`
        : !peersShorter(car, s.peers)
          ? `the shortest of ${b.of} ${bodyPlural(car.body)}`
          : `${ordinal(b.rank)} of ${b.of} ${bodyPlural(car.body)}`;
  const range =
    `Its estimated real-world range is ${formatDistance(car.rangeKm)} in a mix of town, country and motorway driving. ` +
    `${rangeCompare}, and ${inBody}.`;

  const effDiff = (s.medianWhPerKm - car.whPerKm) / s.medianWhPerKm;
  const effCompare =
    Math.abs(effDiff) < 0.04
      ? "about the same as the typical EV on sale"
      : effDiff > 0
        ? "more efficient than the typical EV on sale"
        : "less efficient than the typical EV on sale";
  const efficiency =
    `It uses around ${formatEfficiency(car.whPerKm)}, ${effCompare} (${formatMiPerKwh(s.medianWhPerKm)}). ` +
    `The usable battery holds ${car.batteryKwh} kWh and on a rapid charger it averages ${car.fastchargeKw} kW between 10% and 80%. ` +
    `With one 15-minute charging stop, it can cover an estimated ${formatDistance(car.oneStopKm)} at motorway speeds.`;

  const kit: string[] = [];
  kit.push(car.heatPump ? "It has a heat pump, which helps preserve range in cold weather" : "No heat pump is listed for this version");
  kit.push(car.v2l ? "it supports vehicle-to-load (V2L), so it can power appliances from its battery" : "it does not support vehicle-to-load (V2L)");
  let features = `${kit[0]}, and ${kit[1]}.`;
  if (car.chemistry === "LFP") {
    features += " The battery uses LFP chemistry, which manufacturers generally allow to be charged to 100% routinely.";
  } else if (car.chemistry === "NCM") {
    features += " The battery uses NCM chemistry, which stores more energy for its weight than LFP.";
  }

  const ppm = pricePerMile(car);
  const valueDiff = (ppm - s.medianPricePerMileInBody) / s.medianPricePerMileInBody;
  const valueCompare =
    Math.abs(valueDiff) < 0.05 ? "close to" : valueDiff < 0 ? "lower than" : "higher than";
  const value =
    `Its UK starting price works out at ${formatGbpPerMile(car.priceGbp, car.rangeKm)} per mile of real-world range, ` +
    `${valueCompare} the median for ${bodyPlural(car.body)} (${formatGbp(s.medianPricePerMileInBody)} per mile).`;

  return [intro + " " + range, efficiency, features, value];
}
