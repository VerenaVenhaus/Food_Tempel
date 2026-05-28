// Länderküchen + Kontinent-Zuordnung.
//
// Wir nutzen das an zwei Stellen: im Rezept-Formular (Mehrfachauswahl bei
// "Küche/Land") und im Filter (gleiche zwei Dropdowns, gleiche Logik).
//
// In der DB landet pro Rezept eine komma-separierte Liste von Country-Codes
// in `recipe.cuisine` ("italian,german"). Continents werden NICHT separat
// gespeichert — sie werden aus den ausgewählten Ländern abgeleitet. Das
// spart eine Schema-Migration und hält Single-Source-of-Truth.

export type Continent =
  | "europe"
  | "asia"
  | "africa"
  | "americas"
  | "oceania";

export const CONTINENT_OPTIONS: { value: Continent; label: string }[] = [
  { value: "europe", label: "Europa" },
  { value: "asia", label: "Asien" },
  { value: "africa", label: "Afrika" },
  { value: "americas", label: "Amerika" },
  { value: "oceania", label: "Ozeanien" },
];

export type Country = {
  value: string;
  label: string;
  continent: Continent;
};

export const COUNTRIES: Country[] = [
  // Europa
  { value: "german", label: "Deutschland", continent: "europe" },
  { value: "italian", label: "Italien", continent: "europe" },
  { value: "french", label: "Frankreich", continent: "europe" },
  { value: "spanish", label: "Spanien", continent: "europe" },
  { value: "portuguese", label: "Portugal", continent: "europe" },
  { value: "greek", label: "Griechenland", continent: "europe" },
  { value: "dutch", label: "Niederlande", continent: "europe" },
  { value: "belgian", label: "Belgien", continent: "europe" },
  { value: "swiss", label: "Schweiz", continent: "europe" },
  { value: "austrian", label: "Österreich", continent: "europe" },
  { value: "british", label: "Großbritannien", continent: "europe" },
  { value: "irish", label: "Irland", continent: "europe" },
  { value: "scandinavian", label: "Skandinavien", continent: "europe" },
  { value: "polish", label: "Polen", continent: "europe" },
  { value: "hungarian", label: "Ungarn", continent: "europe" },
  { value: "czech", label: "Tschechien", continent: "europe" },
  { value: "russian", label: "Russland", continent: "europe" },

  // Asien
  { value: "chinese", label: "China", continent: "asia" },
  { value: "japanese", label: "Japan", continent: "asia" },
  { value: "korean", label: "Korea", continent: "asia" },
  { value: "indian", label: "Indien", continent: "asia" },
  { value: "thai", label: "Thailand", continent: "asia" },
  { value: "vietnamese", label: "Vietnam", continent: "asia" },
  { value: "indonesian", label: "Indonesien", continent: "asia" },
  { value: "filipino", label: "Philippinen", continent: "asia" },
  { value: "turkish", label: "Türkei", continent: "asia" },
  { value: "persian", label: "Iran / Persisch", continent: "asia" },
  { value: "lebanese", label: "Libanon", continent: "asia" },
  { value: "israeli", label: "Israel", continent: "asia" },

  // Afrika
  { value: "moroccan", label: "Marokko", continent: "africa" },
  { value: "tunisian", label: "Tunesien", continent: "africa" },
  { value: "egyptian", label: "Ägypten", continent: "africa" },
  { value: "ethiopian", label: "Äthiopien", continent: "africa" },
  { value: "west-african", label: "Westafrika", continent: "africa" },
  { value: "south-african", label: "Südafrika", continent: "africa" },

  // Amerika (Nord + Süd zusammen)
  { value: "american", label: "USA", continent: "americas" },
  { value: "canadian", label: "Kanada", continent: "americas" },
  { value: "mexican", label: "Mexiko", continent: "americas" },
  { value: "cuban", label: "Kuba", continent: "americas" },
  { value: "caribbean", label: "Karibik", continent: "americas" },
  { value: "brazilian", label: "Brasilien", continent: "americas" },
  { value: "argentinian", label: "Argentinien", continent: "americas" },
  { value: "peruvian", label: "Peru", continent: "americas" },

  // Ozeanien
  { value: "australian", label: "Australien", continent: "oceania" },
  { value: "new-zealand", label: "Neuseeland", continent: "oceania" },
];

// Map country-value → continent für schnelle Lookups.
const COUNTRY_TO_CONTINENT: Record<string, Continent> = Object.fromEntries(
  COUNTRIES.map((c) => [c.value, c.continent]),
);

/**
 * Welche Kontinente decken die übergebenen Länder ab?
 * "italian" + "spanish" → ["europe"]
 * "italian" + "mexican" → ["europe", "americas"]
 */
export function getContinentsForCountries(
  countryValues: string[],
): Continent[] {
  const set = new Set<Continent>();
  for (const cv of countryValues) {
    const cont = COUNTRY_TO_CONTINENT[cv];
    if (cont) set.add(cont);
  }
  return Array.from(set);
}

/**
 * Liefert die Länder, die in einer der übergebenen Kontinent-Gruppen liegen.
 * Leeres Continent-Array → alle Länder.
 */
export function getCountriesForContinents(
  continents: string[],
): Country[] {
  if (continents.length === 0) return COUNTRIES;
  const set = new Set(continents);
  return COUNTRIES.filter((c) => set.has(c.continent));
}

/**
 * Speicherformat ↔ Form-Array. Backward-compatible: alte Single-Value-Werte
 * ("german") werden zu Single-Element-Arrays.
 */
export function parseCuisineString(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function joinCuisineArray(arr: string[]): string | null {
  const cleaned = arr.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return cleaned.join(",");
}

// Lookup-Map: "italian" → "Italien". Enthält auch Kontinent-Werte
// ("europe" → "Europa") — der User kann nur einen Kontinent ohne Land
// speichern, dann steht z.B. "europe" als Wert in der cuisine-Spalte.
export const CUISINE_LABEL_BY_VALUE: Record<string, string> = {
  ...Object.fromEntries(COUNTRIES.map((c) => [c.value, c.label])),
  ...Object.fromEntries(CONTINENT_OPTIONS.map((c) => [c.value, c.label])),
};

// Set aller Kontinent-Werte — nützlich, um beim Laden eines Rezepts zu
// trennen, welche Einträge der gemischten cuisine-Spalte Kontinente sind
// und welche Länder.
export const CONTINENT_VALUES: ReadonlySet<string> = new Set(
  CONTINENT_OPTIONS.map((c) => c.value),
);

// Komma-Liste aus der DB ("italian,german") in lesbare Form formatieren:
// "Italien, Deutschland".
export function formatCuisines(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => CUISINE_LABEL_BY_VALUE[v] ?? v)
    .join(", ");
}
