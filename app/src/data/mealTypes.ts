// Mahlzeit-Typen — jetzt Mehrfachauswahl.
//
// In der DB landet pro Rezept eine komma-separierte Liste in
// `recipe.meal_type`. Backward-compat: alte Single-Values ("breakfast")
// parsen als 1-Element-Array.

export type MealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "dessert"
  | "soup"
  | "salad"
  | "appetizer"
  | "sidedish"
  | "pastry"
  | "cake"
  | "bread"
  | "sauce"
  | "spread";

// Alphabetisch (deutsch, case-insensitiv) sortiert — der User soll die
// Liste schnell durchscannen können. Wenn neue Werte dazukommen, einfach
// einsortieren.
export const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "dinner", label: "Abend" },
  { value: "sidedish", label: "Beilage" },
  { value: "bread", label: "Brot" },
  { value: "spread", label: "Brotaufstrich" },
  { value: "dessert", label: "Dessert" },
  { value: "breakfast", label: "Frühstück" },
  { value: "pastry", label: "Gebäck" },
  { value: "cake", label: "Kuchen" },
  { value: "lunch", label: "Mittag" },
  { value: "salad", label: "Salat" },
  { value: "sauce", label: "Sauce" },
  { value: "snack", label: "Snack" },
  { value: "soup", label: "Suppe" },
  { value: "appetizer", label: "Vorspeise" },
];

export function parseMealTypeString(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function joinMealTypeArray(arr: string[]): string | null {
  const cleaned = arr.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return cleaned.join(",");
}

// Lookup-Map für schöne Labels: "breakfast" → "Frühstück".
export const MEAL_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  MEAL_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

// Komma-Liste aus der DB ("breakfast,soup") in lesbare Form formatieren:
// "Frühstück, Suppe". Unbekannte Werte werden 1:1 durchgereicht.
//
// Da Food- und Drink-Rezepte beide die `meal_type`-Spalte nutzen, aber mit
// disjunkten Wertebereichen ("breakfast" ↔ "cocktail"), reichen wir hier
// optional eine zweite Label-Map (z.B. DRINK_LABEL_BY_VALUE) als Fallback
// durch — so kommt der Caller mit einer Funktion aus, egal ob food oder drink.
export function formatMealTypes(
  s: string | null | undefined,
  extraLabels?: Record<string, string>,
): string {
  if (!s) return "";
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => MEAL_LABEL_BY_VALUE[v] ?? extraLabels?.[v] ?? v)
    .join(", ");
}
