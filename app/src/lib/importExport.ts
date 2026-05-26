// Import von einer per Share/Datei erhaltenen JSON-Datei.
// Wandelt das Envelope-Format in einen CreateRecipeInput um und legt
// das Rezept lokal an.

import {
  createRecipe,
  saveNutrition,
  type CreateRecipeInput,
} from "../db/repositories";
import { parseShareEnvelope, type RecipeShareEnvelope } from "./share";

/**
 * Nimmt den JSON-Inhalt einer geteilten Datei und legt das Rezept lokal an.
 * Tags der Quelle werden auf existierende Tags gemappt (per Name).
 *
 * Gibt die ID des neu angelegten Rezepts zurück, oder wirft.
 */
export async function importRecipeFromJson(jsonContent: string): Promise<string> {
  const envelope = parseShareEnvelope(jsonContent);
  const r = envelope.recipe;

  // Tag-IDs auflösen — wir nutzen unsere lokalen Tags (per Name-Match).
  // Tags, die wir nicht kennen, lassen wir einfach weg — der User kann
  // sie nachher manuell zuweisen.
  const { listTags } = await import("../db/repositories");
  const allTags = await listTags();
  const tagIds: string[] = [];
  for (const sourceTag of r.tags) {
    const match = allTags.find(
      (t) => t.name.toLowerCase() === sourceTag.name.toLowerCase(),
    );
    if (match) tagIds.push(match.id);
  }

  const input: CreateRecipeInput = {
    title: r.title,
    description: r.description ?? undefined,
    instructions: r.instructions,
    prepTimeMinutes: r.prepTimeMinutes ?? undefined,
    cookTimeMinutes: r.cookTimeMinutes ?? undefined,
    servings: r.servings ?? undefined,
    cuisine: r.cuisine ?? undefined,
    mealType: r.mealType ?? undefined,
    kind: r.kind ?? "food",
    sourceType: "manual", // beim Import wird das Original-sourceType verloren
    sourceUrl: r.sourceUrl ?? undefined,
    ingredients: r.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      notes: i.notes,
    })),
    tagIds,
  };

  const recipeId = await createRecipe(input);

  // Nährwerte, falls vorhanden
  if (r.nutrition) {
    await saveNutrition(recipeId, {
      calories: r.nutrition.calories,
      proteinG: r.nutrition.proteinG,
      carbsG: r.nutrition.carbsG,
      fatG: r.nutrition.fatG,
      fiberG: r.nutrition.fiberG,
      sugarG: r.nutrition.sugarG,
      source: r.nutrition.source as "manual" | "api",
    });
  }

  return recipeId;
}

// Re-Export, damit Komponenten nicht zwei Module importieren müssen
export type { RecipeShareEnvelope };
