// Live-Autocomplete-Quelle: Open Food Facts.
//
// OFF betreibt einen kostenlosen Suggest-Endpoint, der für unsere Zwecke
// genau passt:
//
//   GET https://world.openfoodfacts.org/cgi/suggest.pl
//       ?tagtype=ingredients&term=apf&lc=de
//   → ["Apfel", "Apfeldicksaft", "Apfelessig", ...]
//
// Kein API-Key, keine Auth, keine Rate-Limit-Doku — wir verhalten uns trotzdem
// freundlich: kurzer User-Agent, kurzer Timeout, Suche erst ab 2 Zeichen.

import { COMMON_INGREDIENT_NAMES } from "../data/commonIngredients";

const OFF_SUGGEST_URL = "https://world.openfoodfacts.org/cgi/suggest.pl";
const TIMEOUT_MS = 5_000;
const MAX_RESULTS = 20;
const MIN_TERM_LENGTH = 2;

/**
 * Fragt OFF nach Zutat-Vorschlägen passend zum Suchbegriff.
 * Doppel-Treffer mit der bundled Liste werden gefiltert (sonst doppelte
 * "Apfel"-Zeilen).
 *
 * @param signal AbortController-Signal, damit veraltete Anfragen abgebrochen
 *               werden, wenn der User schon weitergetippt hat.
 */
export async function suggestIngredientsFromOFF(
  term: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const cleaned = term.trim();
  if (cleaned.length < MIN_TERM_LENGTH) return [];

  const url =
    `${OFF_SUGGEST_URL}?tagtype=ingredients` +
    `&term=${encodeURIComponent(cleaned)}` +
    `&lc=de`;

  // Eigener Timeout-Controller, der auch dann auslöst, wenn das übergebene
  // signal noch lebt. AbortSignal.any wäre eleganter, ist aber noch nicht
  // überall verfügbar.
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
  signal?.addEventListener("abort", () => timeoutController.abort());

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "FoodTempel/0.1 (https://food-tempel.app)",
      },
      signal: timeoutController.signal,
    });
    if (!response.ok) return [];

    const data: unknown = await response.json();
    if (!Array.isArray(data)) return [];

    // Bundled-Treffer rausfiltern → keine Duplikate in der gemergten Anzeige
    const result: string[] = [];
    for (const item of data) {
      if (typeof item !== "string") continue;
      if (COMMON_INGREDIENT_NAMES.has(item)) continue;
      result.push(item);
      if (result.length >= MAX_RESULTS) break;
    }
    return result;
  } catch {
    // Netzfehler / abgebrochen / Timeout — leise zurückgeben, der User
    // hat in der bundled Liste schon Vorschläge.
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}
