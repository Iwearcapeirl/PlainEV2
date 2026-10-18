/**
 * Forgiving name matching, used by every name search on the site: case, accents, spaces, dots and dashes don't
 * matter, so "id3" finds "ID.3", "eniro" finds "e-Niro" and "skoda" finds "Škoda".
 */

/** "Volkswagen ID.3 Pro" → "volkswagenid3pro"; "450+" → "450plus". */
export const squash = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]/g, "");

/**
 * The query's words, squashed. A bare number joins the word before it when that word has no number of its own, so
 * "id 3" means "id3" and "model 3" means "model3" (not "id" and "3" anywhere), while "id3 58 kwh" stays three words.
 */
function queryWords(query: string): string[] {
  const out: string[] = [];
  for (const w of query.split(/\s+/).map(squash).filter(Boolean)) {
    const prev = out[out.length - 1];
    if (/^\d+$/.test(w) && prev && !/\d/.test(prev)) out[out.length - 1] = prev + w;
    else out.push(w);
  }
  return out;
}

/** Every word of the query appears somewhere in the text, ignoring spacing and punctuation. */
export function looseIncludes(text: string, query: string): boolean {
  const words = queryWords(query);
  if (!words.length) return true;
  const hay = squash(text);
  return words.every((w) => hay.includes(w));
}
