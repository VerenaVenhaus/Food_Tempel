// Manueller Cloud-Backup / -Restore via Supabase.
//
// Strategie bewusst einfach:
//   - "Sichern": geht ALLE lokalen Rezepte durch, packt jedes als JSON-
//     Envelope und macht ein UPSERT in die cloud_recipes-Tabelle.
//     Existierte schon eine Cloud-Zeile mit dieser ID → wird überschrieben.
//   - "Wiederherstellen": lädt ALLE Cloud-Zeilen des Users und legt sie
//     lokal neu an. KEINE Konfliktauflösung — bestehende lokale Rezepte
//     mit der gleichen ID werden NICHT überschrieben (wir prüfen das vorher).
//
// Für Multi-Device-Sync ist das ausreichend, solange der User es bewusst macht.

import { getDb } from "../db/client";
import {
  createRecipe,
  getRecipeById,
  listRecipes,
  listTags,
  saveNutrition,
  type RecipeWithDetails,
} from "../db/repositories";
import { type Nutrition, recipes } from "../db/schema";
import type { RecipeShareEnvelope } from "./share";
import { supabase } from "./supabase";

const TABLE = "cloud_recipes";

export type BackupResult = {
  uploaded: number;
  failed: Array<{ title: string; error: string }>;
};

export type RestoreResult = {
  imported: number;
  skipped: number; // schon lokal vorhanden
  failed: Array<{ title: string; error: string }>;
};

// Konvertiert ein RecipeWithDetails in unser Wire-Format (gleich wie share.ts,
// aber wir können es nicht importieren wegen circulärer Abhängigkeit —
// stattdessen hier eine zweite kleine Funktion).
function toEnvelope(r: RecipeWithDetails): RecipeShareEnvelope {
  return {
    type: "food-tempel-recipe",
    version: 1,
    exportedAt: new Date().toISOString(),
    recipe: {
      title: r.title,
      description: r.description,
      instructions: r.instructions,
      prepTimeMinutes: r.prepTimeMinutes,
      cookTimeMinutes: r.cookTimeMinutes,
      servings: r.servings,
      cuisine: r.cuisine,
      mealType: r.mealType,
      sourceType: r.sourceType,
      sourceUrl: r.sourceUrl,
      ingredients: r.ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes,
      })),
      tags: r.tags.map((t) => ({ name: t.name, category: t.category })),
      nutrition: r.nutrition
        ? {
            calories: r.nutrition.calories,
            proteinG: r.nutrition.proteinG,
            carbsG: r.nutrition.carbsG,
            fatG: r.nutrition.fatG,
            fiberG: r.nutrition.fiberG,
            sugarG: r.nutrition.sugarG,
            source: r.nutrition.source,
          }
        : null,
    },
  };
}

/**
 * Lädt alle lokalen Rezepte in die Cloud.
 * Benötigt: eingeloggter User + cloud_recipes-Tabelle in Supabase.
 */
export async function backupAllToCloud(): Promise<BackupResult> {
  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) {
    throw new Error("Nicht eingeloggt.");
  }

  const local = await listRecipes();
  const result: BackupResult = { uploaded: 0, failed: [] };

  // Sequenziell, damit Fehler einzeln behandelt werden können.
  for (const recipe of local) {
    try {
      const detail = await getRecipeById(recipe.id);
      if (!detail) continue;
      const envelope = toEnvelope(detail);

      const { error } = await supabase.from(TABLE).upsert(
        {
          id: detail.id,
          user_id: userId,
          title: detail.title,
          recipe_data: envelope,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (error) {
        result.failed.push({ title: recipe.title, error: error.message });
      } else {
        result.uploaded++;
      }
    } catch (err) {
      result.failed.push({
        title: recipe.title,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return result;
}

/**
 * Löscht alle Cloud-Rezepte des aktuellen Users — die lokalen bleiben.
 * Nützlich, wenn der User Cloud-Storage freiräumen will.
 */
export async function clearCloudBackup(): Promise<number> {
  if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");
  const { data: sess } = await supabase.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) throw new Error("Nicht eingeloggt.");

  // Erst zählen, damit wir dem User sagen können wie viele weg sind
  const { count } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { error } = await supabase.from(TABLE).delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Holt alle Cloud-Rezepte des Users und legt sie lokal an,
 * wenn die ID noch nicht existiert.
 */
export async function restoreFromCloud(): Promise<RestoreResult> {
  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, recipe_data");
  if (error) throw new Error(error.message);

  const result: RestoreResult = { imported: 0, skipped: 0, failed: [] };
  // Wir brauchen die existierenden IDs einmal vorab, damit wir nicht für
  // jedes Cloud-Rezept einzeln in die DB greifen.
  const existing = await getDb().select({ id: recipes.id }).from(recipes);
  const existingIds = new Set(existing.map((r) => r.id));

  // listTags einmal vorab, damit wir Tags mappen können
  const allTags = await listTags();

  for (const row of data ?? []) {
    if (existingIds.has(row.id as string)) {
      result.skipped++;
      continue;
    }
    try {
      const envelope = row.recipe_data as RecipeShareEnvelope;
      // Type-check minimal
      if (
        !envelope ||
        envelope.type !== "food-tempel-recipe" ||
        envelope.version !== 1
      ) {
        throw new Error("Unbekanntes Cloud-Format");
      }
      const r = envelope.recipe;

      const tagIds = r.tags
        .map((t) => allTags.find((x) => x.name.toLowerCase() === t.name.toLowerCase())?.id)
        .filter((id): id is string => !!id);

      const recipeId = await createRecipe({
        title: r.title,
        description: r.description ?? undefined,
        instructions: r.instructions,
        prepTimeMinutes: r.prepTimeMinutes ?? undefined,
        cookTimeMinutes: r.cookTimeMinutes ?? undefined,
        servings: r.servings ?? undefined,
        cuisine: r.cuisine ?? undefined,
        mealType:
          (r.mealType as
            | "breakfast"
            | "lunch"
            | "dinner"
            | "snack"
            | "dessert"
            | undefined) ?? undefined,
        sourceType: "manual",
        sourceUrl: r.sourceUrl ?? undefined,
        ingredients: r.ingredients.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          notes: i.notes,
        })),
        tagIds,
      });

      if (r.nutrition) {
        await saveNutrition(recipeId, {
          calories: r.nutrition.calories,
          proteinG: r.nutrition.proteinG,
          carbsG: r.nutrition.carbsG,
          fatG: r.nutrition.fatG,
          fiberG: r.nutrition.fiberG,
          sugarG: r.nutrition.sugarG,
          source: (r.nutrition as Nutrition).source as "manual" | "api",
        });
      }

      result.imported++;
    } catch (err) {
      result.failed.push({
        title: (row.recipe_data as RecipeShareEnvelope)?.recipe?.title ?? "(unbekannt)",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
