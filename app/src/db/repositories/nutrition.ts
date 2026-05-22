// Repository für die Nährwerte-Daten.
// Eigene Tabelle (1:1 zu recipes), nicht in recipes selbst, damit
// Rezepte ohne Nährwerte schlank bleiben.

import { eq } from "drizzle-orm";

import { getDb } from "../client";
import { type Nutrition, nutrition } from "../schema";

export type NutritionInput = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  sugarG: number | null;
  source?: "manual" | "api";
};

export async function getNutrition(recipeId: string): Promise<Nutrition | null> {
  const [row] = await getDb()
    .select()
    .from(nutrition)
    .where(eq(nutrition.recipeId, recipeId));
  return row ?? null;
}

/**
 * Speichert Nährwerte für ein Rezept. UPSERT-Verhalten:
 * - existiert keine Zeile → INSERT
 * - existiert eine → UPDATE
 */
export async function saveNutrition(
  recipeId: string,
  input: NutritionInput,
): Promise<void> {
  const now = Date.now();
  const existing = await getNutrition(recipeId);

  if (existing) {
    await getDb()
      .update(nutrition)
      .set({
        calories: input.calories,
        proteinG: input.proteinG,
        carbsG: input.carbsG,
        fatG: input.fatG,
        fiberG: input.fiberG,
        sugarG: input.sugarG,
        source: input.source ?? "manual",
        updatedAt: now,
      })
      .where(eq(nutrition.recipeId, recipeId));
  } else {
    await getDb().insert(nutrition).values({
      recipeId,
      calories: input.calories,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      fiberG: input.fiberG,
      sugarG: input.sugarG,
      source: input.source ?? "manual",
      updatedAt: now,
    });
  }
}

export async function deleteNutrition(recipeId: string): Promise<void> {
  await getDb().delete(nutrition).where(eq(nutrition.recipeId, recipeId));
}
