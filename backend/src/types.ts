export type ExtractedRecipe = {
  title?: string;
  description?: string;
  // 1-Zeilen-Vorschau. KI generiert sie aus der Beschreibung, falls die
  // Quelle keine eigene hat (sonst übernimmt sie die vorhandene).
  shortDescription?: string;
  instructions?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  cuisine?: string;
  // Bei kind=food: breakfast/lunch/dinner/snack/dessert/soup/salad/... (siehe mealTypes.ts).
  // Bei kind=drink: cocktail/wine/coffee/... (siehe drinkTypes.ts).
  // Kommagetrennt für Mehrfach-Auswahl. Welche Liste gilt, wird der KI per
  // Request-Parameter mitgegeben — sie soll `kind` NICHT selbst bestimmen.
  mealType?: string;
  // Tag-Namen aus dem geseedeten Tag-Set (vegan, glutenfrei, scharf, ...).
  // Die App matched die Strings case-insensitiv auf die DB-IDs.
  tags?: string[];
  imageUri?: string;
  sourceUrl?: string;
  ingredients?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  }>;
  confidence?: number;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
