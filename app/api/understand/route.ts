import Anthropic from "@anthropic-ai/sdk";
import { cars } from "@/lib/cars";
import { kmToMiles } from "@/lib/format";
import {
  MAX_QUERY_LENGTH,
  answersFromText,
  fieldsGuide,
  normaliseAnswers,
  normaliseRefinement,
  optionsGuide,
  refinementFromText,
  searchSchema,
} from "@/lib/understand";

/**
 * POST { text } → { answers, refinement, source }. Claude maps a free-text description onto the quiz's options,
 * plus extra filters and a sort on any other field in the data (towing, boot space, safety rating, make…)
 * (structured output, so it can only choose real option ids and field keys). If Claude can't be reached (no credentials,
 * network, refusal, bad output) the built-in rules answer instead, so search always works.
 */

// Give Claude time to answer on Vercel and similar hosts (the default limit can be shorter than the API call).
export const maxDuration = 60;

/** Short reason codes for the fallback, so you can see why the rules were used without exposing anything sensitive. */
type FallbackReason = "no_api_key" | "api_error" | "timeout" | "refusal" | "bad_output" | "unreachable";

const prices = cars.map((c) => c.priceGbp).sort((a, b) => a - b);
const ranges = cars.map((c) => kmToMiles(c.rangeKm)).sort((a, b) => a - b);
const accels = cars.map((c) => c.accelS).sort((a, b) => a - b);
/** Quickest 0–62 mph time within each budget ceiling, so Claude knows what "quick" can mean at a given price. */
const quickestUnder = [30_000, 40_000, 50_000, 70_000]
  .map((cap) => `£${cap / 1000}k: ${Math.min(...cars.filter((c) => c.priceGbp <= cap).map((c) => c.accelS))} s`)
  .join(", ");

// Fixed text, so repeated requests share one cached prefix.
const SYSTEM = `You turn a UK car buyer's description of the electric car they want into filters for an EV comparison site.

The site lists ${cars.length} EVs on sale in the UK, from £${prices[0].toLocaleString("en-GB")} to £${prices[prices.length - 1].toLocaleString("en-GB")}, with real-world ranges from ${ranges[0]} to ${ranges[ranges.length - 1]} miles and 0–62 mph times from ${accels[0]} to ${accels[accels.length - 1]} seconds (median ${accels[Math.floor(accels.length / 2)]} s). The quickest car at or under each price: ${quickestUnder}. Results are the five best matches ranked by the priority.

Quiz filters (key: "option id" = meaning):
${optionsGuide()}

Extra filters ("extra": a list of {field, min, max, equals}; use min/max for numbers and equals for everything else, leaving the unused ones null):
${fieldsGuide()}

Sort ("sort"): {field, direction}. Use field "none" to keep the normal ranking by the priority. Set a sort only when they ask for the most or least of something that isn't a priority, such as the biggest boot, the lightest car or the newest model.

How to choose:
- Every filter defaults to "any" (or "no-limit" for budget). Only set a filter when the description clearly asks for it or strongly implies it. Over-filtering leaves the buyer with no matches, so when unsure, leave it on the default.
- Budget options are price ceilings. Pick the band whose ceiling is closest to the stated maximum; "over-70k" and "no-limit" both mean no ceiling. If they give an exact maximum that isn't a band ceiling (say £35k), pick the smallest band whose ceiling is at or above it and also add an extra filter on "price" with that max.
- Range options are minimums in real-world miles. Pick the highest option that does not exceed what they ask for. Regular long motorway trips suggest "300"; typical commuting needs no filter unless they give a distance.
- Infer sensibly from everyday language: "a big dog and three kids" suggests an SUV or estate only if they also mention space; "seven seats" or "third row" means seats "7"; snowy or rural roads suggest drive "awd"; very cold winters suggest a heat pump; camping or powering tools suggests V2L; cheap running costs suggest priority "efficiency".
- Acceleration: 0–60 mph, 0–62 mph and 0–100 km/h are treated as the same measure. When they want a quick, fast, sporty or nippy car without giving a time, set priority to "acceleration" (quickest first within their other filters) and leave "accel" on "any", because a time cut-off can easily rule out every car at their budget. Set "accel" only when they state a time or clearly ask for a seriously fast car with no tight budget; pick the option at or just below the time they give. If they ask for both quick acceleration and long range, use priority "acceleration" only if pace is the main point of the description.
- Use the quiz filters for anything they cover (budget, range, body, seats, drive, battery chemistry, heat pump, V2L, efficiency, one-stop range, acceleration). Use extra filters for everything else: a make or model name, towing (a towbar, or a minimum towing weight; a typical caravan needs about 1,200 kg), boot space in litres, weight, Euro NCAP stars, AC charging speed, V2H or V2G, size class, model year, whether sales are ending, whether figures are confirmed or estimated, and prices in Germany or the Netherlands. You can also use an extra filter for a precise number the quiz bands can't express, such as "at least 280 miles" (field "range", in miles).
- Leave "extra" empty and sort on "none" when nothing beyond the quiz filters is asked for.
- Anything the data can't express (colour, interior materials, brand loyalty) is ignored.`;

export async function POST(request: Request) {
  let text = "";
  try {
    const body = await request.json();
    text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_QUERY_LENGTH) : "";
  } catch {
    return Response.json({ error: "Send JSON with a text field." }, { status: 400 });
  }
  if (!text) return Response.json({ error: "Describe the car you're looking for." }, { status: 400 });

  const fallback = (reason: FallbackReason, error?: { status?: number; type?: string | null; message?: string }) => {
    const detail = error ? ` ${error.status ?? ""} ${error.type ?? ""} ${error.message ?? ""}`.replace(/\s+/g, " ") : "";
    console.warn(`understand: using built-in rules (${reason})${detail}`);
    // The details stay in the server log (Vercel → Logs); visitors only get the short reason code.
    return Response.json({ answers: answersFromText(text), refinement: refinementFromText(text), source: "rules", reason });
  };

  // The SDK reads ANTHROPIC_API_KEY. If it's missing here, the variable isn't reaching this deployment
  // (wrong name, wrong environment, or the site hasn't been redeployed since it was added).
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return fallback("no_api_key", { message: "ANTHROPIC_API_KEY is not set for this deployment" });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim(), timeout: 45_000, maxRetries: 1 });
  const base = {
    // Haiku is the fastest and cheapest model, and mapping a description onto fixed options is a simple job.
    model: "claude-haiku-5-5",
    max_tokens: 4000,
    output_config: { effort: "low" as const, format: { type: "json_schema" as const, schema: searchSchema() } },
    system: [{ type: "text" as const, text: SYSTEM, cache_control: { type: "ephemeral" as const } }],
    messages: [{ role: "user" as const, content: `Buyer's description:\n<description>\n${text}\n</description>` }],
  };

  try {
    const response = await client.beta.messages.create(base);

    if (response.stop_reason === "refusal") return fallback("refusal");
    const out = response.content.find((b) => b.type === "text");
    if (response.stop_reason !== "end_turn" || !out || out.type !== "text") {
      return fallback("bad_output", { message: `stop_reason ${response.stop_reason}` });
    }
    try {
      const parsed = JSON.parse(out.text);
      return Response.json({ answers: normaliseAnswers(parsed), refinement: normaliseRefinement(parsed), source: "ai", model: response.model });
    } catch {
      return fallback("bad_output", { message: "response was not valid JSON" });
    }
  } catch (error) {
    if (error instanceof Anthropic.APIConnectionTimeoutError) return fallback("timeout");
    if (error instanceof Anthropic.APIConnectionError) return fallback("unreachable", { message: error.message });
    // The API's own message says what's wrong, e.g. "invalid x-api-key" or a low credit balance. It never contains the key.
    if (error instanceof Anthropic.APIError) {
      return fallback("api_error", { status: error.status, type: error.type, message: error.message.slice(0, 300) });
    }
    return fallback("unreachable", { message: (error as Error).message });
  }
}
