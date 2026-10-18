import { allCars } from "./cars";
import { EMPTY_REFINEMENT, FIELDS, SORT_FIELDS, fieldByKey, isSet, type CustomFilter, type Refinement } from "./fields";
import { milesToKm } from "./format";
import { squash } from "./text";
import { CONDITIONS, COUNTRY_IDS, type Condition, type Country } from "./market";
import { DEFAULT_ANSWERS, FILTER_KEYS, FILTERS, PRIORITIES, type Answers, type FilterKey, type PriorityId } from "./quiz";

/**
 * Free-text search: turns "a 7-seater under £50k that can do 300 miles" into the same Answers the quiz produces,
 * so it shares the quiz's results page. Anything the quiz can't express (towing, boot space, safety rating,
 * make, V2H…) becomes a "Filter and sort" refinement on the results page, so every column in the data can be
 * searched. The server route asks Claude first; `answersFromText` and `refinementFromText` below are the
 * built-in fallback (and run in the browser if the route can't be reached).
 */

export const MAX_QUERY_LENGTH = 500;

/** Keep only values the quiz knows; anything else falls back to "no preference". */
export function normaliseAnswers(raw: Partial<Record<string, unknown>>): Answers {
  const a = { ...DEFAULT_ANSWERS };
  for (const key of FILTER_KEYS) {
    const v = raw[key];
    if (typeof v === "string" && FILTERS[key].some((o) => o.id === v)) a[key] = v;
  }
  if (PRIORITIES.some((p) => p.id === raw.priority)) a.priority = raw.priority as PriorityId;
  if (COUNTRY_IDS.includes(raw.country as Country)) a.country = raw.country as Country;
  if (CONDITIONS.some((c) => c.id === raw.condition)) a.condition = raw.condition as Condition;
  return a;
}

/** JSON schema for Claude's structured output: one enum per quiz filter, so it can only pick real options. */
export function answersSchema() {
  const properties: Record<string, { type: "string"; enum: string[] }> = {};
  for (const key of FILTER_KEYS) properties[key] = { type: "string", enum: FILTERS[key].map((o) => o.id) };
  properties.priority = { type: "string", enum: PRIORITIES.map((p) => p.id) };
  properties.country = { type: "string", enum: [...COUNTRY_IDS] };
  properties.condition = { type: "string", enum: CONDITIONS.map((c) => c.id) };
  return {
    type: "object" as const,
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/** The quiz's options, written out for the model: filter key, then each id with what it means. */
export function optionsGuide(): string {
  const lines = FILTER_KEYS.map((key: FilterKey) => {
    const opts = FILTERS[key].map((o) => `"${o.id}" = ${o.chip ?? "no preference"}${o.label !== o.chip ? ` (${o.label})` : ""}`);
    return `- ${key}: ${opts.join("; ")}`;
  });
  lines.push(`- priority: ${PRIORITIES.map((p) => `"${p.id}" = ${p.hint}`).join("; ")}`);
  lines.push(`- country: "uk" = buying in the UK (prices in £); "de" = Germany (prices in €); "nl" = the Netherlands (prices in €)`);
  lines.push(`- condition: ${CONDITIONS.map((c) => `"${c.id}" = ${c.label.toLowerCase()}`).join("; ")}`);
  return lines.join("\n");
}

// ---------- Built-in rules ----------

const BUDGET_CAPS: [string, number][] = [
  ["under-10k", 10_000],
  ["10-15k", 15_000],
  ["15-20k", 20_000],
  ["under-30k", 30_000],
  ["30-40k", 40_000],
  ["40-50k", 50_000],
  ["50-70k", 70_000],
];

/** A money amount in pounds from "£35k", "35,000", "35 grand", "£35000". */
function money(text: string): number | null {
  const m = text.match(/[£€]?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|grand|thousand)?/i);
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  if (m[2]) n *= 1000;
  else if (n < 1000) n *= 1000; // "under 35" in a budget phrase means £35k
  return n;
}

/** The budget band whose cap is nearest the amount (ties go to the cheaper band, since budgets are usually ceilings). */
function nearestBudget(max: number): string {
  if (max > 70_000) return "no-limit";
  let best = BUDGET_CAPS[0];
  for (const cap of BUDGET_CAPS) if (Math.abs(cap[1] - max) < Math.abs(best[1] - max)) best = cap;
  return best[0];
}

export function answersFromText(input: string, defaultCountry: Country = "uk"): Answers {
  const t = input.toLowerCase();
  const a = { ...DEFAULT_ANSWERS };

  // Where they're buying ("German" alone usually means the make, so only country names count), and new or used.
  if (/\b(germany|deutschland)\b/.test(t)) a.country = "de";
  else if (/\b(the netherlands|netherlands|holland|nederland)\b/.test(t)) a.country = "nl";
  else if (/\b(the uk|in uk|united kingdom|britain|england|scotland|wales)\b/.test(t)) a.country = "uk";
  else a.country = defaultCountry;
  const used = /\bused\b(?! (to|for|by|as|in|on|with)\b)|\bsecond[- ]?hand\b|\bpre[- ]?owned\b|\bnearly new\b/.test(t);
  const isNew = /\bbrand[- ]new\b|\bnew car\b|\bbuy(ing)? (it )?new\b|\bnew only\b|\bfrom new\b/.test(t);
  a.condition = used && !isNew ? "used" : isNew && !used ? "new" : "both";

  // Budget: an amount after a ceiling word, or any £ amount.
  const budgetPhrase = t.match(/(?:under|below|less than|up to|max(?:imum)?|budget(?: of| is)?|around|about|no more than)\s*[£€]?\s*[\d,.]+(?![\d,.])(?!\s*(?:s\b|secs?\b|seconds?|mph|mi\b|miles?|km|kwh|kw\b|seats?))\s*(?:k|grand|thousand)?/);
  const symbol = t.includes("£") ? "£" : t.includes("€") ? "€" : null;
  const pounds = budgetPhrase ? money(budgetPhrase[0]) : symbol ? money(t.slice(t.indexOf(symbol))) : null;
  if (pounds) a.budget = nearestBudget(pounds);
  else if (/\b(cheap|cheapest|affordable|budget|low cost)\b/.test(t)) a.budget = "under-30k";
  if (/\b(no (budget|limit)|money no object|luxury)\b/.test(t)) a.budget = "no-limit";

  // Range: an explicit figure (miles or km), else a hint from how they drive.
  const dist = t.match(/(\d{3})\s*(miles?|mi\b|km|kilomet)/);
  if (dist) {
    const km = dist[2].startsWith("k") ? Number(dist[1]) : milesToKm(Number(dist[1]));
    const fits = FILTERS.range.filter((o) => o.id !== "any" && milesToKm(Number(o.id)) <= km + 1);
    if (fits.length) a.range = fits[fits.length - 1].id;
  } else if (/\b(long[- ]distance|lots of motorway|road ?trips?|long journeys)\b/.test(t)) a.range = "300";

  // Body style
  if (/\b(suv|crossover)s?\b/.test(t)) a.body = "suv";
  else if (/\bhatch(back)?s?\b/.test(t)) a.body = "hatchback";
  else if (/\b(saloon|sedan|liftback|fastback)s?\b/.test(t)) a.body = "saloon";
  else if (/\b(estate|wagon|touring|tourer)s?\b/.test(t)) a.body = "estate";

  // Optional filters
  if (/\b(7|seven)[- ]?(seat|seater)|third row|7 seats\b/.test(t)) a.seats = "7";
  else if (/\b(5|five)[- ]?(seat|seater)/.test(t)) a.seats = "5";
  if (/\b(awd|4x4|4wd|all[- ]wheel|four[- ]wheel)\b/.test(t)) a.drive = "awd";
  else if (/\b(rwd|rear[- ]wheel)\b/.test(t)) a.drive = "rwd";
  else if (/\b(fwd|front[- ]wheel)\b/.test(t)) a.drive = "fwd";
  if (/\blfp\b/.test(t)) a.chemistry = "lfp";
  else if (/\b(ncm|nmc)\b/.test(t)) a.chemistry = "ncm";
  if (/heat ?pump|cold (weather|winters?)/.test(t)) a.heatPump = "yes";
  if (/\bv2l\b|vehicle[- ]to[- ]load|power (appliances|a kettle|tools)|camping/.test(t)) a.v2l = "yes";
  if (/\b(efficient|efficiency|cheap to run|running costs?|economical)\b/.test(t)) a.priority = "efficiency";

  // Acceleration. A stated time ("0-60 in under 5 seconds") sets the matching filter; words like "quick" or
  // "sporty" without a time rank the quickest cars first instead, so a tight budget still returns cars.
  const time = t.match(/0\s*[-–to]+\s*(?:60|62|100)\b[^\d]{0,25}?(\d+(?:\.\d+)?)\s*(?:s\b|sec)/) ?? t.match(/\b(?:under|below|less than)\s*(\d+(?:\.\d+)?)\s*(?:s\b|sec)/);
  if (time) {
    const seconds = Number(time[1]);
    const fits = FILTERS.accel.filter((o) => o.id !== "any" && Number(o.id) <= seconds);
    a.accel = fits.length ? fits[0].id : FILTERS.accel[FILTERS.accel.length - 1].id;
  }
  const noCharging = t.replace(/\b(fast|quick|rapid)[- ]?charg\w*|charging (speed|time)s?/g, "");
  if (time || /\b(quick|fast|nippy|sporty|sports car|performance|accelerat\w*|0\s*-\s*60)\b/.test(noCharging)) {
    a.priority = "acceleration";
  }

  return a;
}

// ---------- Extra filters and sort (every other column in the data) ----------

/** JSON schema for the search: the quiz answers plus extra field filters and an optional sort. */
export function searchSchema() {
  const base = answersSchema();
  return {
    ...base,
    properties: {
      ...base.properties,
      extra: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            field: { type: "string" as const, enum: FIELDS.map((f) => f.key) },
            min: { type: ["number", "null"] },
            max: { type: ["number", "null"] },
            equals: { type: ["string", "null"] },
          },
          required: ["field", "min", "max", "equals"],
          additionalProperties: false,
        },
      },
      sort: {
        type: "object" as const,
        properties: {
          field: { type: "string" as const, enum: ["none", ...SORT_FIELDS.map((f) => f.key)] },
          direction: { type: "string" as const, enum: ["asc", "desc"] },
        },
        required: ["field", "direction"],
        additionalProperties: false,
      },
    },
    required: [...base.required, "extra", "sort"],
  };
}

/** Every filterable field, written out for the model: key, type, unit and (for choices) the allowed values. */
export function fieldsGuide(): string {
  return FIELDS.map((f) => {
    const about = f.about ? `; ${f.about}` : "";
    switch (f.kind) {
      case "number":
        return `- ${f.key}: ${f.label} (number${f.unit ? `, ${f.unit}` : ""}${about}) → min/max`;
      case "choice":
        return `- ${f.key}: ${f.label} (one of: ${f.options.map((o) => (o.label === o.value ? `"${o.value}"` : `"${o.value}" = ${o.label}`)).join(", ")}${about}) → equals`;
      case "bool":
        return `- ${f.key}: ${f.label} (yes/no${about}) → equals "yes" or "no"`;
      case "text":
        return `- ${f.key}: ${f.label} (text, matches if it contains the words${about}) → equals`;
    }
  }).join("\n");
}

type RawExtra = { field?: unknown; min?: unknown; max?: unknown; equals?: unknown };

/** Turns the model's extra filters and sort into a Refinement, dropping anything invalid. */
export function normaliseRefinement(raw: { extra?: unknown; sort?: unknown }): Refinement {
  const byKey = new Map<string, CustomFilter>();
  for (const e of Array.isArray(raw.extra) ? (raw.extra as RawExtra[]) : []) {
    const field = typeof e?.field === "string" ? fieldByKey(e.field) : undefined;
    if (!field) continue;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const text = typeof e.equals === "string" ? e.equals.trim() : "";
    let value: string | null = null;
    if (field.kind === "number") {
      const lo = num(e.min);
      const hi = num(e.max);
      if (lo !== null || hi !== null) value = `${lo ?? ""}~${hi ?? ""}`;
    } else if (field.kind === "choice") {
      const want = text.toLowerCase();
      value = field.options.find((o) => o.value.toLowerCase() === want || o.label.toLowerCase() === want)?.value ?? null;
    } else if (field.kind === "bool") {
      if (/^(yes|true)$/i.test(text)) value = "yes";
      else if (/^(no|false)$/i.test(text)) value = "no";
    } else if (text) {
      value = text;
    }
    if (value !== null) byKey.set(field.key, { key: field.key, value });
  }
  const sortRaw = (raw.sort ?? {}) as { field?: unknown; direction?: unknown };
  const sort = typeof sortRaw.field === "string" && SORT_FIELDS.some((f) => f.key === sortRaw.field) ? sortRaw.field : null;
  return { filters: [...byKey.values()].filter(isSet), sort, dir: sortRaw.direction === "desc" ? "desc" : "asc" };
}

// Built-in rules for the extra fields.

/** Spoken or common names for makes in the data. */
const MAKE_ALIASES: Record<string, string> = {
  vw: "Volkswagen",
  mercedes: "Mercedes-Benz",
  merc: "Mercedes-Benz",
  skoda: "Škoda",
  citroen: "Citroën",
  vauxhall: "Opel",
  "range rover": "Land Rover",
  "rolls royce": "Rolls-Royce",
  ds: "DS Automobiles",
};
/** Makes that are also everyday words, so they only count when written with a capital letter. */
const CASE_SENSITIVE_MAKES = new Set(["Mini", "Smart", "Alpine", "Genesis", "Lotus", "DS Automobiles", "Jeep"]);
const MAKES = [...new Set(allCars.map((c) => c.make))];
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A whole-word match that also works for names with accents (Škoda, Citroën). */
const wordRe = (word: string, caseSensitive: boolean) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}(?![\\p{L}\\p{N}])`, caseSensitive ? "u" : "iu");

function makeFromText(input: string): string | null {
  for (const make of MAKES) if (wordRe(make, CASE_SENSITIVE_MAKES.has(make)).test(input)) return make;
  for (const [alias, make] of Object.entries(MAKE_ALIASES)) {
    // "DS" only counts in capitals.
    if (alias === "ds" ? wordRe("DS", true).test(input) : wordRe(alias, false).test(input)) return make;
  }
  return null;
}

/**
 * Model names with a number in them ("ID.3", "EV6", "Model 3", "Ioniq 5"), as written in the data and squashed for
 * matching. Names without a number are left out: too many are everyday words ("Spring", "Born", "Explorer").
 */
const MODEL_NAMES = [...new Set(allCars.map((c) => (c.family.startsWith(c.make + " ") ? c.family.slice(c.make.length + 1) : "")))]
  .filter((m) => /\d/.test(m) && /[a-z]/i.test(m) && squash(m).length >= 2)
  .map((name) => ({ name, key: squash(name) }));

/** A model name in the text, written any way: "id3", "ID.3", "id 3", "model 3". */
function modelFromText(input: string): string | null {
  const words = input.split(/\s+/).map(squash).filter(Boolean);
  const pieces = new Set([...words, ...words.slice(1).map((w, i) => words[i] + w)]);
  // Longest first, so "ioniq 5 n" isn't read as "ioniq 5".
  for (const m of [...MODEL_NAMES].sort((a, b) => b.key.length - a.key.length)) if (pieces.has(m.key)) return m.name;
  return null;
}

/** Extra filters and sort from plain words, for when Claude can't be reached. */
export function refinementFromText(input: string): Refinement {
  const t = input.toLowerCase();
  const filters: CustomFilter[] = [];
  let sort: string | null = null;
  let dir: "asc" | "desc" = "asc";
  const add = (key: string, value: string) => filters.push({ key, value });
  const kg = (near: RegExp) => {
    const m = t.match(new RegExp(`(?:${near.source})[^\\d]{0,30}?(\\d[\\d,]*)\\s*kg|(\\d[\\d,]*)\\s*kg[^\\d]{0,30}?(?:${near.source})`));
    return m ? Number((m[1] ?? m[2]).replace(/,/g, "")) : null;
  };

  const make = makeFromText(input);
  if (make) add("make", make);
  const model = modelFromText(input);
  if (model) add("name", model);

  // Towing
  if (/\btow(s|ing|bar)?\b|caravan|trailer|horse ?box/.test(t)) {
    add("towbar", "yes");
    const weight = kg(/tow\w*|caravan|trailer|horse ?box/);
    if (weight) add("towing", `${weight}~`);
    else if (/caravan|horse ?box/.test(t)) add("towing", "1200~");
  }

  // Boot space
  const litres = t.match(/(\d{3,4})\s*(?:l\b|litres?|liters?)/);
  if (litres) add("boot", `${litres[1]}~`);
  else if (/\b(big|large|huge|massive|biggest|largest|lots of) (boot|luggage|cargo)|boot space|luggage space/.test(t)) {
    sort = "boot";
    dir = "desc";
  }

  // Safety
  const stars = t.match(/\b([345])[- ]?star/);
  if (stars) add("ncap", `${stars[1]}~`);
  else if (/\b(safest|euro ?ncap|safety rating|very safe)\b/.test(t)) add("ncap", "5~");

  // Bidirectional charging
  if (/\bv2h\b|vehicle[- ]to[- ]home|power (my|the|our) (house|home)/.test(t)) add("v2h", "yes");
  if (/\bv2g\b|vehicle[- ]to[- ]grid|sell (power|electricity|energy) back/.test(t)) add("v2g", "yes");

  // AC charging
  const ac = t.match(/\b(22|11|7)\s*kw\s*(?:ac|home|onboard|on-board|wallbox)/) ?? t.match(/\b(?:ac|onboard|on-board) (?:charging|charger) (?:of )?(22|11|7)\s*kw/);
  if (ac) add("ac", `${ac[1]}~`);
  else if (/\b(fast|quick) (home|ac) charging|22\s*kw\b/.test(t)) add("ac", "22~");

  // Weight
  const heavy = kg(/weigh\w*|weight/);
  if (heavy) add("weight", `~${heavy}`);
  else if (/\b(lightweight|lightest|light car|not too heavy)\b/.test(t)) {
    if (!sort) sort = "weight";
  }

  // Age of the model
  const year = t.match(/\b(20[2-3]\d)\s*(?:model|onwards|or newer|or later)/);
  if (year) add("year", `${year[1]}~`);
  else if (/\b(newest|latest|brand new) models?\b/.test(t) && !sort) {
    sort = "year";
    dir = "desc";
  }
  if (/\b(discontinued|end of line|run-?out|being replaced)\b/.test(t)) add("ending", "yes");
  if (/\b(confirmed|official|verified) (range|figures?|numbers?)\b/.test(t)) add("rangeest", "no");

  return filters.length || sort ? { filters, sort, dir } : EMPTY_REFINEMENT;
}

