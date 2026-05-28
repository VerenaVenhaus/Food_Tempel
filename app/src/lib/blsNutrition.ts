// Berechnet Nährwerte aus dem gerätelokalen BLS — exakt, offline.
//
// Aufgerufen aus `calculateNutrition()` in api.ts. Diese Datei verarbeitet
// NUR Zutaten mit einem `blsCode` (aus dem Autocomplete). Zutaten ohne Code
// (frei getippt / Markenprodukt) werden im Rückgabe-Wert als
// `uncodedIngredients` aufgesammelt — der Caller schickt sie dann an das
// Backend, das per Open Food Facts nachschlägt.

import { getBlsFoodByCode } from "../db/repositories";
import { convertToGrams } from "./unitsToGrams";

// Eingabe-Form für eine Zutat — kompatibel zur API-Form.
export type NutritionInputIngredient = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  blsCode?: string | null;
};

// Ergebnis: aufsummierte ABSOLUTE Werte (NICHT pro Portion — der Caller teilt
// am Ende durch die Portionen, nachdem er ggf. den Backend-Anteil dazu addiert).
export type BlsPartialTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  // Zutaten, die einen Code hatten, aber nicht eingerechnet werden konnten
  // (Code in der DB nicht gefunden, oder unbekannte Einheit).
  missing: string[];
  // Zutaten ohne BLS-Code — kommen vom Aufrufer an das Backend weitergegeben.
  uncodedIngredients: NutritionInputIngredient[];
};

const EMPTY: BlsPartialTotals = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  sugarG: 0,
  missing: [],
  uncodedIngredients: [],
};

/**
 * Summiert die BLS-Nährwerte aller Zutaten mit `blsCode`. Werte im BLS sind
 * pro 100 g; wir wandeln die Mengenangabe in Gramm um und rechnen mit
 * `grams / 100` als Faktor. Fehlende Messwerte (`null` im BLS) zählen als 0
 * — gleiche Konvention wie die bisherige Backend-Logik.
 */
export function computeBlsTotals(
  ingredients: NutritionInputIngredient[],
): BlsPartialTotals {
  const totals: BlsPartialTotals = { ...EMPTY, missing: [], uncodedIngredients: [] };

  for (const ing of ingredients) {
    if (!ing.blsCode) {
      totals.uncodedIngredients.push(ing);
      continue;
    }
    const food = getBlsFoodByCode(ing.blsCode);
    if (!food) {
      // Code zeigt ins Leere — kann nur passieren, wenn der Datensatz nach
      // einem BLS-Update wegfiele. Defensiv als fehlend flaggen.
      totals.missing.push(ing.name);
      continue;
    }
    const grams = convertToGrams(ing.quantity ?? 0, ing.unit ?? null);
    if (grams == null) {
      totals.missing.push(
        `${ing.name} (Einheit „${ing.unit}" unbekannt — bitte z.B. in g umrechnen)`,
      );
      continue;
    }
    if (grams <= 0) continue;

    const factor = grams / 100;
    totals.calories += (food.kcal ?? 0) * factor;
    totals.proteinG += (food.protein ?? 0) * factor;
    totals.carbsG += (food.carbs ?? 0) * factor;
    totals.fatG += (food.fat ?? 0) * factor;
    totals.fiberG += (food.fiber ?? 0) * factor;
    totals.sugarG += (food.sugar ?? 0) * factor;
  }

  return totals;
}
