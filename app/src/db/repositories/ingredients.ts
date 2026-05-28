// Repository für Zutaten — vor allem für Zutaten-basierte Suche und
// Auto-Complete im Rezept-Formular ("Welche Zutaten gibt's schon?").

import { asc, eq, like, inArray } from "drizzle-orm";

import { getDb } from "../client";
import {
  type Ingredient,
  ingredients,
  recipeIngredients,
  recipes,
} from "../schema";
import { newId } from "../uuid";

export async function listIngredients(): Promise<Ingredient[]> {
  return getDb().select().from(ingredients).orderBy(asc(ingredients.name));
}

export async function searchIngredients(prefix: string): Promise<Ingredient[]> {
  if (!prefix) return [];
  return getDb()
    .select()
    .from(ingredients)
    .where(like(ingredients.name, `${prefix}%`))
    .orderBy(asc(ingredients.name))
    .limit(20);
}

/**
 * Liefert die Zutat zurück oder legt sie neu an, falls noch nicht vorhanden.
 * Wird vom Rezept-Repo intern genutzt — hier exportiert für andere Stellen.
 */
export async function findOrCreateIngredient(
  name: string,
  defaultUnit?: string,
  blsCode?: string | null,
): Promise<string> {
  const [existing] = await getDb()
    .select()
    .from(ingredients)
    .where(eq(ingredients.name, name));
  if (existing) {
    // BLS-Code nachtragen, falls noch keiner gesetzt war.
    if (blsCode && !existing.blsCode) {
      await getDb()
        .update(ingredients)
        .set({ blsCode })
        .where(eq(ingredients.id, existing.id));
    }
    return existing.id;
  }

  const id = newId();
  await getDb().insert(ingredients).values({ id, name, defaultUnit, blsCode: blsCode ?? null });
  return id;
}

/**
 * Findet alle Rezepte, die eine der angegebenen Zutaten enthalten.
 * "Habe Tomaten und Hackfleisch — was kann ich kochen?"
 */
export async function findRecipesByIngredientNames(
  ingredientNames: string[],
): Promise<Array<{ id: string; title: string }>> {
  if (ingredientNames.length === 0) return [];

  return getDb()
    .selectDistinct({ id: recipes.id, title: recipes.title })
    .from(recipes)
    .innerJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
    .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
    .where(inArray(ingredients.name, ingredientNames))
    .orderBy(asc(recipes.title));
}
