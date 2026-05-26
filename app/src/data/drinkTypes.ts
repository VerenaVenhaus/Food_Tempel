// Getränke-Typen — Gegenstück zu MEAL_TYPE_OPTIONS für den Drinks-Modus.
//
// Speicherung: gleiche DB-Spalte `recipe.meal_type`, nur mit drink-spezifischen
// Werten. Welcher Optionssatz dem User gezeigt wird, entscheidet sich am
// `recipe.kind` ("food" oder "drink").

export type DrinkType =
  | "cocktail"
  | "mocktail"
  | "shake"
  | "beer"
  | "wine"
  | "sparkling-wine"
  | "spirit"
  | "liqueur"
  | "lemonade"
  | "juice"
  | "schorle"
  | "tea"
  | "coffee"
  | "hot-drink"
  | "water"
  | "iced-tea"
  | "energy-drink"
  | "syrup"
  | "punch"
  | "mulled-wine";

// Alphabetisch sortiert (deutsch).
export const DRINK_TYPE_OPTIONS: { value: DrinkType; label: string }[] = [
  { value: "beer", label: "Bier" },
  { value: "cocktail", label: "Cocktail" },
  { value: "energy-drink", label: "Energy-Drink" },
  { value: "mulled-wine", label: "Glühwein" },
  { value: "hot-drink", label: "Heißgetränk" },
  { value: "iced-tea", label: "Eistee" },
  { value: "coffee", label: "Kaffee" },
  { value: "lemonade", label: "Limonade" },
  { value: "liqueur", label: "Likör" },
  { value: "mocktail", label: "Mocktail" },
  { value: "punch", label: "Punsch" },
  { value: "juice", label: "Saft" },
  { value: "sparkling-wine", label: "Sekt / Schaumwein" },
  { value: "schorle", label: "Schorle" },
  { value: "shake", label: "Shake / Smoothie" },
  { value: "spirit", label: "Spirituose" },
  { value: "syrup", label: "Sirup" },
  { value: "tea", label: "Tee" },
  { value: "water", label: "Wasser" },
  { value: "wine", label: "Wein" },
];

export const DRINK_LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  DRINK_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

// Komma-Liste in lesbare Form: "wine,beer" → "Wein, Bier".
export function formatDrinkTypes(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => DRINK_LABEL_BY_VALUE[v] ?? v)
    .join(", ");
}
