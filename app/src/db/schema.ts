// Drizzle-Schema für die lokale SQLite-Datenbank.
// Wir definieren jede Tabelle als TypeScript-Konstante. Drizzle erzeugt daraus
// sowohl die SQL-CREATE-Statements als auch die Typen für unsere Queries.
//
// Wichtige Drizzle-Konzepte:
// - sqliteTable("name", { spalten })  → definiert eine Tabelle
// - text(), integer(), real()         → SQL-Spaltentypen
// - .primaryKey()                     → markiert die ID-Spalte
// - .notNull()                        → Spalte darf nicht NULL sein
// - .references(...)                  → Fremdschlüssel auf andere Tabelle

import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// -----------------------------------------------------------------------------
// recipes: Hauptdaten eines Rezepts
// -----------------------------------------------------------------------------
export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(), // UUID, wir generieren mit expo-crypto
  title: text("title").notNull(),
  description: text("description"),
  instructions: text("instructions").notNull(), // Markdown / Schritte mit \n getrennt
  prepTimeMinutes: integer("prep_time_minutes"),
  cookTimeMinutes: integer("cook_time_minutes"),
  servings: integer("servings"),
  imageUri: text("image_uri"), // lokaler Datei-Pfad oder URL
  // Wo kommt das Rezept her? Beeinflusst evtl. UI ("automatisch erkannt").
  sourceType: text("source_type", {
    enum: ["manual", "photo", "url", "pdf", "camera"],
  })
    .notNull()
    .default("manual"),
  sourceUrl: text("source_url"),
  // Filter-Felder
  cuisine: text("cuisine"), // "german", "italian", "japanese", ...
  mealType: text("meal_type", {
    enum: ["breakfast", "lunch", "dinner", "snack", "dessert"],
  }),
  // Unix-Timestamp in Millisekunden. SQLite hat kein natives Datums-Format,
  // INTEGER ist der gängige Weg.
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// -----------------------------------------------------------------------------
// ingredients: Stammliste aller Zutaten
// -----------------------------------------------------------------------------
// Eine Zutat ("Mehl") wird einmal angelegt und kann in vielen Rezepten benutzt
// werden. Das hält die Datenmenge klein und erlaubt später Zutaten-basierte Suche.
export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // "Mehl", "Tomate", ...
  defaultUnit: text("default_unit"), // Vorschlag für die UI, z.B. "g" bei Mehl
  createdAt: integer("created_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// -----------------------------------------------------------------------------
// recipe_ingredients: m:n-Verknüpfung mit Mengenangabe
// -----------------------------------------------------------------------------
// Jede Zeile = "in Rezept X kommen Y Einheiten von Zutat Z".
// ON DELETE CASCADE: wenn Rezept gelöscht wird, verschwinden auch seine Zeilen hier.
export const recipeIngredients = sqliteTable("recipe_ingredients", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredients.id),
  quantity: real("quantity"), // real = Fließkommazahl, z.B. 0.5
  unit: text("unit"), // "g", "ml", "TL", "EL", "Stück", ...
  notes: text("notes"), // z.B. "fein gehackt"
  sortOrder: integer("sort_order").notNull().default(0),
});

// -----------------------------------------------------------------------------
// tags: Labels für Filter (vegan, vegetarisch, diabetes-geeignet, …)
// -----------------------------------------------------------------------------
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // "vegan", "diabetes-friendly", ...
  // Kategorisiert das Tag für UI-Gruppierung im Filter-Menü
  category: text("category", {
    enum: ["diet", "health", "allergen", "occasion"],
  }).notNull(),
});

// -----------------------------------------------------------------------------
// recipe_tags: m:n-Verknüpfung Rezepte ↔ Tags
// -----------------------------------------------------------------------------
// Composite Primary Key (recipe_id, tag_id) → ein Tag kann pro Rezept nur einmal vorkommen.
export const recipeTags = sqliteTable(
  "recipe_tags",
  {
    recipeId: text("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.recipeId, table.tagId] }),
  }),
);

// -----------------------------------------------------------------------------
// nutrition: optionale Nährwerte pro Rezept (1:1)
// -----------------------------------------------------------------------------
// Eigene Tabelle, weil oft NULL und so der recipes-Block schlank bleibt.
export const nutrition = sqliteTable("nutrition", {
  recipeId: text("recipe_id")
    .primaryKey()
    .references(() => recipes.id, { onDelete: "cascade" }),
  calories: real("calories"), // kcal pro Portion
  proteinG: real("protein_g"),
  carbsG: real("carbs_g"),
  fatG: real("fat_g"),
  fiberG: real("fiber_g"),
  sugarG: real("sugar_g"),
  source: text("source", { enum: ["manual", "api"] }).notNull().default("manual"),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

// -----------------------------------------------------------------------------
// Typen aus dem Schema ableiten — so muss nichts doppelt geschrieben werden.
// `typeof recipes.$inferSelect` = Typ wenn man eine Zeile aus der DB liest
// `typeof recipes.$inferInsert` = Typ wenn man eine Zeile einfügt (manche Felder optional)
// -----------------------------------------------------------------------------
export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;

export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;

export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type NewRecipeIngredient = typeof recipeIngredients.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type Nutrition = typeof nutrition.$inferSelect;
export type NewNutrition = typeof nutrition.$inferInsert;
