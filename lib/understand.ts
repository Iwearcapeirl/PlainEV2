import { milesToKm } from "./format";
import { DEFAULT_ANSWERS, FILTER_KEYS, FILTERS, PRIORITIES, type Answers, type FilterKey, type PriorityId } from "./quiz";

/**
 * Free-text search: turns "a 7-seater under £50k that can do 300 miles" into the same Answers the quiz produces,
 * so it shares the quiz's results page. The server route asks Claude first; `answersFromText` below is the
 * built-in fallback (and runs in the browser if the route can't be reached).
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
  return a;
}

/** JSON schema for Claude's structured output: one enum per quiz filter, so it can only pick real options. */
export function answersSchema() {
  const properties: Record<string, { type: "string"; enum: string[] }> = {};
  for (const key of FILTER_KEYS) properties[key] = { type: "string", enum: FILTERS[key].map((o) => o.id) };
  properties.priority = { type: "string", enum: PRIORITIES.map((p) => p.id) };
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
  return lines.join("\n");
}

// ---------- Built-in rules ----------

const BUDGET_CAPS: [string, number][] = [
  ["under-30k", 30_000],
  ["30-40k", 40_000],
  ["40-50k", 50_000],
  ["50-70k", 70_000],
];

/** A money amount in pounds from "£35k", "35,000", "35 grand", "£35000". */
function money(text: string): number | null {
  const m = text.match(/£?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k|grand|thousand)?/i);
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

export function answersFromText(input: string): Answers {
  const t = input.toLowerCase();
  const a = { ...DEFAULT_ANSWERS };

  // Budget: an amount after a ceiling word, or any £ amount.
  const budgetPhrase = t.match(/(?:under|below|less than|up to|max(?:imum)?|budget(?: of| is)?|around|about|no more than)\s*£?\s*[\d,.]+\s*(?:k|grand|thousand)?/);
  const pounds = budgetPhrase ? money(budgetPhrase[0]) : t.includes("£") ? money(t.slice(t.indexOf("£"))) : null;
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

  return a;
}
