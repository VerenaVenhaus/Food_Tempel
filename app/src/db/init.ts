// Datenbank-Initialisierung.
// Wird einmal beim App-Start aufgerufen. Legt fehlende Tabellen an
// (CREATE TABLE IF NOT EXISTS) und befüllt die tags-Tabelle mit Standard-Werten.
//
// Hinweis: Wir nutzen hier noch keine Drizzle-Kit-Migrations, sondern führen
// die SQL-Statements direkt aus. Das reicht für die Lernphase. Wenn das Schema
// später komplexer wird oder sich oft ändert, stellen wir auf richtige
// Migrations um (siehe drizzle-kit + babel-plugin-inline-import).

import { sql } from "drizzle-orm";

import { getDb, getRawDb } from "./client";
import { tags } from "./schema";
import { newId } from "./uuid";

// Die DDL-Statements müssen mit dem Drizzle-Schema in schema.ts übereinstimmen.
// Wenn du dort eine Spalte hinzufügst, muss sie auch hier landen — ODER du
// löschst die App-Datenbank vom Gerät (deinstallieren + neu installieren) und
// startest neu mit den dann frisch erzeugten Tabellen. Letzteres ist während
// der Entwicklung oft schneller.
const DDL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT NOT NULL,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER,
    servings INTEGER,
    image_uri TEXT,
    source_type TEXT NOT NULL DEFAULT 'manual',
    source_url TEXT,
    cuisine TEXT,
    meal_type TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );`,

  `CREATE TABLE IF NOT EXISTS ingredients (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    default_unit TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );`,

  `CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
    quantity REAL,
    unit TEXT,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );`,

  `CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS recipe_tags (
    recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (recipe_id, tag_id)
  );`,

  `CREATE TABLE IF NOT EXISTS nutrition (
    recipe_id TEXT PRIMARY KEY NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    calories REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    fiber_g REAL,
    sugar_g REAL,
    source TEXT NOT NULL DEFAULT 'manual',
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );`,

  // Indexe für die Felder, nach denen wir häufig filtern/sortieren werden.
  `CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);`,
  `CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);`,
  `CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON recipes(meal_type);`,
  `CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);`,
  `CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);`,
];

// Standard-Tags, die immer da sein sollen. Damit der Filter-Screen sofort
// etwas anzuzeigen hat, auch bevor der User selbst Rezepte angelegt hat.
const SEED_TAGS: Array<{ name: string; category: "diet" | "health" | "allergen" | "occasion" }> = [
  // Diät-Tags
  { name: "vegan", category: "diet" },
  { name: "vegetarisch", category: "diet" },
  { name: "low-carb", category: "diet" },
  { name: "keto", category: "diet" },
  // Gesundheits-Tags
  { name: "diabetes-geeignet", category: "health" },
  { name: "arthrose-geeignet", category: "health" },
  { name: "herzgesund", category: "health" },
  // Allergene
  { name: "glutenfrei", category: "allergen" },
  { name: "laktosefrei", category: "allergen" },
  { name: "nussfrei", category: "allergen" },
  // Anlass
  { name: "schnell", category: "occasion" },
  { name: "meal-prep", category: "occasion" },
  { name: "gäste-tauglich", category: "occasion" },
];

/**
 * Legt fehlende Tabellen an und befüllt Default-Daten.
 * Idempotent: kann beliebig oft aufgerufen werden.
 */
export async function initDatabase(): Promise<void> {
  const rawDb = getRawDb();
  const db = getDb();

  // 1. Schema anlegen (CREATE TABLE IF NOT EXISTS)
  for (const statement of DDL_STATEMENTS) {
    rawDb.execSync(statement);
  }

  // 2. Standard-Tags einfügen, falls noch nicht da
  // Drizzle's "onConflictDoNothing" überspringt Zeilen, deren UNIQUE-Felder
  // bereits existieren — wir können also gefahrlos jedes Mal seedaten.
  for (const seedTag of SEED_TAGS) {
    await db
      .insert(tags)
      .values({ id: newId(), name: seedTag.name, category: seedTag.category })
      .onConflictDoNothing();
  }
}

/**
 * Liefert die Anzahl Rezepte — praktisch für einen schnellen Sanity-Check
 * direkt in App.tsx ("Datenbank hat X Rezepte").
 */
export async function getRecipeCount(): Promise<number> {
  const result = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(sql`recipes`);
  return Number(result[0]?.count ?? 0);
}

/**
 * Liefert die Anzahl Tags — zeigt, dass Seeding funktioniert hat.
 */
export async function getTagCount(): Promise<number> {
  const result = await getDb().select({ count: sql<number>`count(*)` }).from(tags);
  return Number(result[0]?.count ?? 0);
}
