import { both } from "./units";

/**
 * Running costs: what an EV costs per mile to charge, against a petrol car, from its real-world efficiency.
 *
 * EV Database's efficiency is energy from the battery (real range × efficiency = usable battery for every car in the
 * data), so charging losses come on top: about 10% on a home charger, 5% on a rapid charger.
 *
 * The default prices are UK averages, checked by hand. Update them (and RUNNING_CHECKED) when the Ofgem price cap
 * changes every quarter: 1 January, 1 April, 1 July and 1 October.
 */

export interface RunningInputs {
  /** Miles driven a year. */
  miles: number;
  /** Share of charging done at home, 0–100 (the rest on public rapid chargers). */
  homeShare: number;
  /** Home electricity, pence per kWh. */
  homeP: number;
  /** Public rapid charging, pence per kWh. */
  rapidP: number;
  /** The petrol car it's compared with: miles per (UK) gallon. */
  mpg: number;
  /** Petrol, pence per litre. */
  petrolP: number;
}

export const RUNNING_DEFAULTS: RunningInputs = { miles: 8000, homeShare: 80, homeP: 26.32, rapidP: 79, mpg: 45, petrolP: 174.6 };

/** When the default prices were last checked (ISO date). */
export const RUNNING_CHECKED = "2026-10-28";

export const RUNNING_SOURCES = {
  home: {
    label: "Ofgem price cap, 1 October to 31 December 2026",
    note: "Average unit rate paying by Direct Debit. VAT on household electricity is 0% from 1 October 2026 to 31 March 2027.",
    url: "https://www.ofgem.gov.uk/publications/changes-energy-price-cap-between-1-october-and-31-december-2026",
  },
  rapid: {
    label: "Zapmap charging price index, September 2026",
    note: "Average pay-as-you-go price on rapid and ultra-rapid chargers (50 kW and above).",
    url: "https://www.zapmap.com/ev-stats/charging-price-index",
  },
  petrol: {
    label: "GOV.UK weekly road fuel prices, week of 19 October 2026",
    note: "UK average for unleaded petrol.",
    url: "https://www.gov.uk/government/statistics/weekly-road-fuel-prices",
  },
} as const;

/** Extra energy drawn from the charger, on top of what reaches the battery. */
export const HOME_LOSS = 0.1;
export const RAPID_LOSS = 0.05;

const KM_PER_MILE = 1.609344;
const LITRES_PER_GALLON = 4.54609;

export interface RunningCost {
  /** Pence per mile at the chosen home/rapid mix. */
  perMile: number;
  /** Pence per mile charging only at home, and only on rapid chargers. */
  homeOnly: number;
  rapidOnly: number;
  /** Pounds a year and a month at the chosen mileage. */
  perYear: number;
  perMonth: number;
  /** The petrol car: pence per mile and pounds a year. */
  petrolPerMile: number;
  petrolPerYear: number;
  /** Pounds a year saved against petrol (negative if the EV costs more). */
  savingPerYear: number;
}

/** Battery energy per mile, in kWh. */
export const kwhPerMile = (whPerKm: number) => (whPerKm * KM_PER_MILE) / 1000;

/** Petrol cost per mile in pence for a car doing `mpg` (UK gallons) at `petrolP` pence a litre. */
export const petrolPencePerMile = (mpg: number, petrolP: number) => (mpg > 0 ? (LITRES_PER_GALLON / mpg) * petrolP : 0);

export function runningCost(whPerKm: number, i: RunningInputs): RunningCost {
  const kwh = kwhPerMile(whPerKm);
  const homeOnly = kwh * (1 + HOME_LOSS) * i.homeP;
  const rapidOnly = kwh * (1 + RAPID_LOSS) * i.rapidP;
  const share = Math.min(100, Math.max(0, i.homeShare)) / 100;
  const perMile = share * homeOnly + (1 - share) * rapidOnly;
  const perYear = (perMile * i.miles) / 100;
  const petrolPerMile = petrolPencePerMile(i.mpg, i.petrolP);
  const petrolPerYear = (petrolPerMile * i.miles) / 100;
  return { perMile, homeOnly, rapidOnly, perYear, perMonth: perYear / 12, petrolPerMile, petrolPerYear, savingPerYear: petrolPerYear - perYear };
}

const p1 = (n: number) => (n < 10 ? n.toFixed(1) : String(Math.round(n)));

/** "11p a mile" or "6.8p a km" (marked for the units switch). */
export const formatPencePerMile = (pence: number, words = true) =>
  both(`${p1(pence)}p${words ? " a mile" : "/mile"}`, `${p1(pence / KM_PER_MILE)}p${words ? " a km" : "/km"}`);

/** "£73" (whole pounds). */
export const formatPounds = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;

/** One-line summary of the assumptions, e.g. for a ranking's method note. */
export function assumptionsText(i: RunningInputs = RUNNING_DEFAULTS): string {
  return (
    `${both(`${i.miles.toLocaleString("en-GB")} miles`, `${Math.round(i.miles * KM_PER_MILE).toLocaleString("en-GB")} km`)} a year, ` +
    (i.homeShare >= 100
      ? `all charged at home at ${i.homeP}p/kWh, `
      : i.homeShare <= 0
        ? `all charged on rapid chargers at ${i.rapidP}p/kWh, `
        : `${i.homeShare}% charged at home at ${i.homeP}p/kWh and ${100 - i.homeShare}% on rapid chargers at ${i.rapidP}p/kWh, `) +
    `against a ${i.mpg} mpg petrol car at ${i.petrolP}p a litre`
  );
}

/** "/running-costs?cars=a,b" (empty slots kept in place, like the comparison). */
export function runningHref(slugs: (string | null)[]): string {
  const list = [...slugs];
  while (list.length && !list[list.length - 1]) list.pop();
  return list.length ? `/running-costs?cars=${list.map((s) => s ?? "").join(",")}` : "/running-costs";
}
