import Anthropic from "@anthropic-ai/sdk";
import { cars } from "@/lib/cars";
import { kmToMiles } from "@/lib/format";
import { MAX_QUERY_LENGTH, answersFromText, answersSchema, normaliseAnswers, optionsGuide } from "@/lib/understand";

/**
 * POST { text } → { answers, source }. Claude maps a free-text description onto the quiz's options
 * (structured output, so it can only choose real option ids). If Claude can't be reached (no credentials,
 * network, refusal, bad output) the built-in rules answer instead, so search always works.
 */

const prices = cars.map((c) => c.priceGbp).sort((a, b) => a - b);
const ranges = cars.map((c) => kmToMiles(c.rangeKm)).sort((a, b) => a - b);

// Fixed text, so repeated requests share one cached prefix.
const SYSTEM = `You turn a UK car buyer's description of the electric car they want into filters for an EV comparison site.

The site lists ${cars.length} EVs on sale in the UK, from £${prices[0].toLocaleString("en-GB")} to £${prices[prices.length - 1].toLocaleString("en-GB")}, with real-world ranges from ${ranges[0]} to ${ranges[ranges.length - 1]} miles. Results are the five best matches ranked by the priority.

Filters (key: "option id" = meaning):
${optionsGuide()}

How to choose:
- Every filter defaults to "any" (or "no-limit" for budget). Only set a filter when the description clearly asks for it or strongly implies it. Over-filtering leaves the buyer with no matches, so when unsure, leave it on the default.
- Budget options are price ceilings. Pick the band whose ceiling is closest to the stated maximum; "over-70k" and "no-limit" both mean no ceiling.
- Range options are minimums in real-world miles. Pick the highest option that does not exceed what they ask for. Regular long motorway trips suggest "300"; typical commuting needs no filter unless they give a distance.
- Infer sensibly from everyday language: "a big dog and three kids" suggests an SUV or estate only if they also mention space; "seven seats" or "third row" means seats "7"; snowy or rural roads suggest drive "awd"; very cold winters suggest a heat pump; camping or powering tools suggests V2L; cheap running costs suggest priority "efficiency".
- Anything the filters can't express (colour, brand loyalty, towing) is ignored.`;

export async function POST(request: Request) {
  let text = "";
  try {
    const body = await request.json();
    text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_QUERY_LENGTH) : "";
  } catch {
    return Response.json({ error: "Send JSON with a text field." }, { status: 400 });
  }
  if (!text) return Response.json({ error: "Describe the car you're looking for." }, { status: 400 });

  try {
    const client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: answersSchema() } },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `Buyer's description:\n<description>\n${text}\n</description>` }],
    });

    if (response.stop_reason === "end_turn") {
      const out = response.content.find((b) => b.type === "text");
      if (out && out.type === "text") {
        return Response.json({ answers: normaliseAnswers(JSON.parse(out.text)), source: "ai" });
      }
    }
    console.warn(`understand: Claude stopped with ${response.stop_reason}; using built-in rules`);
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.warn(`understand: Claude API error ${error.status}; using built-in rules`);
    else console.warn("understand: Claude unavailable; using built-in rules:", (error as Error).message);
  }

  return Response.json({ answers: answersFromText(text), source: "rules" });
}
