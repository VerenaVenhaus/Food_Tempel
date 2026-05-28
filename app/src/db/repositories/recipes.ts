// Repository-Layer für Rezepte.
// Statt überall in der App rohe Drizzle-Queries zu schreiben, kapseln wir
// die Datenbank-Operationen hier. UI-Komponenten rufen z.B. `listRecipes()`
// auf — wie das intern funktioniert, wissen sie nicht.
// Vorteile: Tests, Wiederverwendung, später-Swap auf Cloud-DB einfacher.

import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";

import { getDb } from "../client";
import {
  ingredients,
  type NewRecipe,
  type NewRecipeIngredient,
  nutrition,
  type Nutrition,
  type Recipe,
  recipeIngredients,
  recipes,
  recipeTags,
  tags,
} from "../schema";
import { newId } from "../uuid";

// Eine "volle" Rezeptansicht: Rezept-Daten + Zutaten + Tags zusammen.
// In der DB sind das drei Tabellen, in der UI wollen wir aber ein Objekt.
export type RecipeWithDetails = Recipe & {
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number | null;
    unit: string | null;
    notes: string | null;
    blsCode: string | null;
  }>;
  tags: Array<{ id: string; name: string; category: string }>;
  nutrition: Nutrition | null;
};

// Eingabe-Form für ein neues Rezept aus der UI.
// `id`, `createdAt`, `updatedAt` setzen wir selbst.
export type CreateRecipeInput = Omit<NewRecipe, "id" | "createdAt" | "updatedAt"> & {
  ingredients?: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    notes?: string | null;
    blsCode?: string | null;
  }>;
  tagIds?: string[];
};

/**
 * Listet alle Rezepte alphabetisch (für die Hauptseite).
 * Optional Suchstring — gematcht wird ausschließlich der Titel.
 */
export async function listRecipes(search?: string): Promise<Recipe[]> {
  if (search && search.trim().length > 0) {
    const pattern = `%${search.trim()}%`;
    return getDb()
      .select()
      .from(recipes)
      .where(like(recipes.title, pattern))
      .orderBy(asc(recipes.title));
  }
  return getDb().select().from(recipes).orderBy(asc(recipes.title));
}

/**
 * Holt ein einzelnes Rezept mit allen Details (Zutaten + Tags).
 * Gibt null zurück wenn nicht gefunden.
 */
export async function getRecipeById(id: string): Promise<RecipeWithDetails | null> {
  const [recipe] = await getDb().select().from(recipes).where(eq(recipes.id, id));
  if (!recipe) return null;

  // Zutaten + Stammnamen joinen
  const ingRows = await getDb()
    .select({
      id: recipeIngredients.id,
      name: ingredients.name,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
      notes: recipeIngredients.notes,
      blsCode: ingredients.blsCode,
      sortOrder: recipeIngredients.sortOrder,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, id))
    .orderBy(asc(recipeIngredients.sortOrder));

  // Tags joinen
  const tagRows = await getDb()
    .select({ id: tags.id, name: tags.name, category: tags.category })
    .from(recipeTags)
    .innerJoin(tags, eq(recipeTags.tagId, tags.id))
    .where(eq(recipeTags.recipeId, id));

  // Nährwerte (optional — kann null sein)
  const [nutritionRow] = await getDb()
    .select()
    .from(nutrition)
    .where(eq(nutrition.recipeId, id));

  return {
    ...recipe,
    ingredients: ingRows.map(({ sortOrder: _ignored, ...rest }) => rest),
    tags: tagRows,
    nutrition: nutritionRow ?? null,
  };
}

/**
 * Neues Rezept anlegen — inklusive Zutaten und Tag-Verknüpfungen.
 * Läuft als Transaktion: entweder alles wird geschrieben oder nichts.
 *
 * `opts.id`: explizite ID statt einer neu generierten. Wird beim
 * Cloud-Restore genutzt, damit die Original-ID erhalten bleibt — sonst
 * würden Re-Restores Duplikate erzeugen.
 */
export async function createRecipe(
  input: CreateRecipeInput,
  opts?: { id?: string },
): Promise<string> {
  const recipeId = opts?.id ?? newId();
  const now = Date.now();

  // Drizzle bietet `db.transaction(...)` — alles innerhalb wird zusammen
  // committed; bei einem Fehler wird automatisch zurückgerollt.
  await getDb().transaction(async (tx) => {
    // 1. Das Rezept selbst
    await tx.insert(recipes).values({
      id: recipeId,
      title: input.title,
      description: input.description,
      shortDescription: input.shortDescription,
      instructions: input.instructions,
      prepTimeMinutes: input.prepTimeMinutes,
      cookTimeMinutes: input.cookTimeMinutes,
      servings: input.servings,
      imageUri: input.imageUri,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl,
      cuisine: input.cuisine,
      mealType: input.mealType,
      kind: input.kind ?? "food",
      createdAt: now,
      updatedAt: now,
    });

    // 2. Zutaten: jede Zutat in der Stammtabelle anlegen (falls neu),
    //    dann Verknüpfung in recipe_ingredients schreiben.
    if (input.ingredients && input.ingredients.length > 0) {
      for (let i = 0; i < input.ingredients.length; i++) {
        const ing = input.ingredients[i];

        // findOrCreate für Zutaten
        let ingredientId: string;
        const [existing] = await tx
          .select()
          .from(ingredients)
          .where(eq(ingredients.name, ing.name));
        if (existing) {
          ingredientId = existing.id;
          // BLS-Code nachtragen, falls die Zutat noch keinen hatte und jetzt
          // einer aus dem Autocomplete mitkommt.
          if (ing.blsCode && !existing.blsCode) {
            await tx
              .update(ingredients)
              .set({ blsCode: ing.blsCode })
              .where(eq(ingredients.id, ingredientId));
          }
        } else {
          ingredientId = newId();
          await tx
            .insert(ingredients)
            .values({ id: ingredientId, name: ing.name, blsCode: ing.blsCode ?? null });
        }

        const link: NewRecipeIngredient = {
          id: newId(),
          recipeId,
          ingredientId,
          quantity: ing.quantity ?? null,
          unit: ing.unit ?? null,
          notes: ing.notes ?? null,
          sortOrder: i,
        };
        await tx.insert(recipeIngredients).values(link);
      }
    }

    // 3. Tags verknüpfen
    if (input.tagIds && input.tagIds.length > 0) {
      for (const tagId of input.tagIds) {
        await tx.insert(recipeTags).values({ recipeId, tagId });
      }
    }
  });

  return recipeId;
}

/**
 * Einzelfelder eines Rezepts aktualisieren (kein Zutaten-/Tag-Update).
 * Wird z.B. genutzt, um nur den Titel oder die Beschreibung zu ändern.
 */
export async function updateRecipe(
  id: string,
  patch: Partial<NewRecipe>,
): Promise<void> {
  await getDb()
    .update(recipes)
    .set({ ...patch, updatedAt: Date.now() })
    .where(eq(recipes.id, id));
}

/**
 * Komplettes Update inkl. Zutaten und Tags.
 * Wird vom Bearbeiten-Formular genutzt: vorhandene Zutaten/Tags werden
 * gelöscht und neu angelegt. Das ist nicht super effizient, aber einfach
 * und korrekt.
 */
export async function updateRecipeWithDetails(
  id: string,
  input: CreateRecipeInput,
): Promise<void> {
  const now = Date.now();

  await getDb().transaction(async (tx) => {
    // 1. Rezept-Hauptdaten aktualisieren
    await tx
      .update(recipes)
      .set({
        title: input.title,
        description: input.description,
        shortDescription: input.shortDescription,
        instructions: input.instructions,
        prepTimeMinutes: input.prepTimeMinutes,
        cookTimeMinutes: input.cookTimeMinutes,
        servings: input.servings,
        imageUri: input.imageUri,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl,
        cuisine: input.cuisine,
        mealType: input.mealType,
        kind: input.kind ?? "food",
        updatedAt: now,
      })
      .where(eq(recipes.id, id));

    // 2. Alte Zutaten-Zeilen wegwerfen, neue einfügen
    await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));

    if (input.ingredients && input.ingredients.length > 0) {
      for (let i = 0; i < input.ingredients.length; i++) {
        const ing = input.ingredients[i];

        let ingredientId: string;
        const [existing] = await tx
          .select()
          .from(ingredients)
          .where(eq(ingredients.name, ing.name));
        if (existing) {
          ingredientId = existing.id;
          if (ing.blsCode && !existing.blsCode) {
            await tx
              .update(ingredients)
              .set({ blsCode: ing.blsCode })
              .where(eq(ingredients.id, ingredientId));
          }
        } else {
          ingredientId = newId();
          await tx
            .insert(ingredients)
            .values({ id: ingredientId, name: ing.name, blsCode: ing.blsCode ?? null });
        }

        await tx.insert(recipeIngredients).values({
          id: newId(),
          recipeId: id,
          ingredientId,
          quantity: ing.quantity ?? null,
          unit: ing.unit ?? null,
          notes: ing.notes ?? null,
          sortOrder: i,
        });
      }
    }

    // 3. Tag-Verknüpfungen wegwerfen, neue setzen
    await tx.delete(recipeTags).where(eq(recipeTags.recipeId, id));
    if (input.tagIds && input.tagIds.length > 0) {
      for (const tagId of input.tagIds) {
        await tx.insert(recipeTags).values({ recipeId: id, tagId });
      }
    }
  });
}

/**
 * Rezept löschen. Zutaten-Verknüpfungen und Tag-Links verschwinden
 * automatisch via ON DELETE CASCADE.
 */
export async function deleteRecipe(id: string): Promise<void> {
  await getDb().delete(recipes).where(eq(recipes.id, id));
}

/**
 * Filterung der Rezepte mit verschiedenen Kriterien.
 *
 * Logik je Feld:
 *  - search          → nur im Titel (case-insensitive durch SQLite-LIKE)
 *  - cuisines        → ODER (Rezept hat eine dieser Küchen)
 *  - mealTypes       → ODER (Rezept hat einen dieser Mahlzeitentypen)
 *  - tagIds          → UND  (Rezept hat ALLE diese Tags)
 *  - ingredientNames → UND  (Rezept enthält ALLE diese Zutaten)
 *
 * Die UND-Logik bei Tags/Zutaten ist die nützlichere Default-Annahme:
 *   "vegan UND glutenfrei" filtert sinnvoll, "vegan ODER glutenfrei"
 *   würde fast alles zurückgeben.
 */
export type RecipeFilter = {
  // "food" oder "drink" — die Liste wird nach diesem Modus eingeengt.
  kind?: "food" | "drink";
  search?: string;
  cuisines?: string[];
  mealTypes?: string[];
  tagIds?: string[];
  // Tag-IDs, die das Rezept NICHT haben darf — z.B. invertierte Allergen-
  // Auswahl ("glutenfrei" → schließt Rezepte mit "enthält-gluten" aus).
  excludedTagIds?: string[];
  ingredientNames?: string[];
  // Nährwerte-Filter (pro Portion). Rezepte ohne erfasste Nährwerte werden
  // ausgeschlossen, wenn einer dieser Filter aktiv ist.
  maxCalories?: number | null;
  minProtein?: number | null;
};

export async function filterRecipes(filter: RecipeFilter): Promise<Recipe[]> {
  const conditions = [];

  if (filter.kind) {
    conditions.push(eq(recipes.kind, filter.kind));
  }

  if (filter.search && filter.search.trim().length > 0) {
    const pattern = `%${filter.search.trim()}%`;
    conditions.push(like(recipes.title, pattern));
  }

  // cuisine + meal_type sind jetzt komma-separierte TEXT-Spalten.
  // Für jeden gesuchten Wert prüfen wir mit LIKE, ob er als ganzes Token
  // in der Spalte steht. Wir umschließen Spalte UND Suchwert mit Kommas
  // → ",german,italian," LIKE "%,german,%" matcht, "%,germ,%" matcht NICHT.
  // OR-verknüpft: ein Treffer bei irgendeinem Wert reicht.
  if (filter.cuisines && filter.cuisines.length > 0) {
    const orParts = filter.cuisines.map(
      (c) =>
        sql`',' || coalesce(${recipes.cuisine}, '') || ',' LIKE ${`%,${c},%`}`,
    );
    conditions.push(or(...orParts)!);
  }

  if (filter.mealTypes && filter.mealTypes.length > 0) {
    const orParts = filter.mealTypes.map(
      (m) =>
        sql`',' || coalesce(${recipes.mealType}, '') || ',' LIKE ${`%,${m},%`}`,
    );
    conditions.push(or(...orParts)!);
  }

  // Tag-AND: pro Tag eine EXISTS-Subquery — Rezept muss für jeden Tag
  // mindestens einen Treffer in recipe_tags haben.
  if (filter.tagIds && filter.tagIds.length > 0) {
    for (const tagId of filter.tagIds) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${recipeTags}
          WHERE ${recipeTags.recipeId} = ${recipes.id}
            AND ${recipeTags.tagId} = ${tagId}
        )`,
      );
    }
  }

  // Ausgeschlossene Tags: Rezept darf KEINEN dieser Tags haben. Spiegelbild
  // zur EXISTS-Logik oben, nur als NOT EXISTS pro ID. Wird vom Filter
  // genutzt, um Allergene zu negieren ("glutenfrei" = nicht "enthält-gluten").
  if (filter.excludedTagIds && filter.excludedTagIds.length > 0) {
    for (const tagId of filter.excludedTagIds) {
      conditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${recipeTags}
          WHERE ${recipeTags.recipeId} = ${recipes.id}
            AND ${recipeTags.tagId} = ${tagId}
        )`,
      );
    }
  }

  // Nährwerte-Filter: EXISTS-Subquery auf nutrition. Beide Filter werden
  // mit AND verknüpft (max-Kalorien UND min-Protein müssen erfüllt sein).
  if (filter.maxCalories != null) {
    const max = filter.maxCalories;
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${nutrition}
        WHERE ${nutrition.recipeId} = ${recipes.id}
          AND ${nutrition.calories} IS NOT NULL
          AND ${nutrition.calories} <= ${max}
      )`,
    );
  }
  if (filter.minProtein != null) {
    const min = filter.minProtein;
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${nutrition}
        WHERE ${nutrition.recipeId} = ${recipes.id}
          AND ${nutrition.proteinG} IS NOT NULL
          AND ${nutrition.proteinG} >= ${min}
      )`,
    );
  }

  // Zutaten-AND: gleiches Muster über recipe_ingredients ⨝ ingredients.name
  if (filter.ingredientNames && filter.ingredientNames.length > 0) {
    for (const ingName of filter.ingredientNames) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${recipeIngredients}
          INNER JOIN ${ingredients}
            ON ${ingredients.id} = ${recipeIngredients.ingredientId}
          WHERE ${recipeIngredients.recipeId} = ${recipes.id}
            AND ${ingredients.name} = ${ingName}
        )`,
      );
    }
  }

  const query = getDb().select().from(recipes);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(asc(recipes.title));
  }
  return query.orderBy(asc(recipes.title));
}

/**
 * Letzte zuerst — für eine "Zuletzt hinzugefügt"-Sektion auf der Startseite.
 */
export async function getRecentRecipes(limit: number = 5): Promise<Recipe[]> {
  return getDb()
    .select()
    .from(recipes)
    .orderBy(desc(recipes.createdAt))
    .limit(limit);
}
