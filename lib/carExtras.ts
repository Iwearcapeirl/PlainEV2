import extras from "@/data/car-extras.json";
import type { InteriorPhoto } from "./cars";

/**
 * Things only car pages need: the EV Database page link and interior photos. Kept out of lib/cars.ts so the
 * browser doesn't download them with the quiz and results. Import this from server components only.
 */
const all = extras as unknown as Record<string, { url: string; interiors: InteriorPhoto[] }>;

export const carExtras = (id: number) => all[String(id)] ?? { url: "", interiors: [] };
