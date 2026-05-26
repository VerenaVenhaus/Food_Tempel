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
    kind TEXT NOT NULL DEFAULT 'food',
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
//
// Beim App-Start wird die Liste durchlaufen und jeder Eintrag mit
// `onConflictDoNothing` eingefügt. Bestehende Tags bleiben unangetastet;
// nur neue Einträge landen frisch in der Datenbank.
const SEED_TAGS: Array<{
  name: string;
  category: "diet" | "health" | "allergen" | "occasion" | "taste" | "alcohol";
}> = [
  // Ernährungsform — 15
  { name: "vegan", category: "diet" },
  { name: "vegetarisch", category: "diet" },
  { name: "pescetarisch", category: "diet" },
  { name: "flexitarisch", category: "diet" },
  { name: "paleo", category: "diet" },
  { name: "low-carb", category: "diet" },
  { name: "keto", category: "diet" },
  { name: "low-fat", category: "diet" },
  { name: "zuckerfrei", category: "diet" },
  { name: "proteinreich", category: "diet" },
  { name: "ballaststoffreich", category: "diet" },
  { name: "rohkost", category: "diet" },
  { name: "vollwertkost", category: "diet" },
  { name: "mediterran", category: "diet" },
  { name: "clean-eating", category: "diet" },

  // Gesundheit — 12
  { name: "diabetes-geeignet", category: "health" },
  { name: "arthrose-geeignet", category: "health" },
  { name: "herzgesund", category: "health" },
  { name: "nierengesund", category: "health" },
  { name: "darmgesund", category: "health" },
  { name: "entzündungshemmend", category: "health" },
  { name: "antioxidativ", category: "health" },
  { name: "immunstärkend", category: "health" },
  { name: "blutdrucksenkend", category: "health" },
  { name: "cholesterinsenkend", category: "health" },
  { name: "schwangerschaftsgeeignet", category: "health" },
  { name: "sportler-geeignet", category: "health" },

  // Allergene — 16 (EU-Top-14 + Histamin + Fructose)
  { name: "glutenfrei", category: "allergen" },
  { name: "laktosefrei", category: "allergen" },
  { name: "nussfrei", category: "allergen" },
  { name: "erdnussfrei", category: "allergen" },
  { name: "eierfrei", category: "allergen" },
  { name: "fischfrei", category: "allergen" },
  { name: "krustentierfrei", category: "allergen" },
  { name: "weichtierfrei", category: "allergen" },
  { name: "sojafrei", category: "allergen" },
  { name: "selleriefrei", category: "allergen" },
  { name: "senffrei", category: "allergen" },
  { name: "sesamfrei", category: "allergen" },
  { name: "schwefelfrei", category: "allergen" },
  { name: "lupinenfrei", category: "allergen" },
  { name: "histaminarm", category: "allergen" },
  { name: "fructosearm", category: "allergen" },

  // Geschmacksrichtung — 18 (neue Kategorie)
  { name: "süß", category: "taste" },
  { name: "salzig", category: "taste" },
  { name: "sauer", category: "taste" },
  { name: "bitter", category: "taste" },
  { name: "umami", category: "taste" },
  { name: "scharf", category: "taste" },
  { name: "mild", category: "taste" },
  { name: "würzig", category: "taste" },
  { name: "nussig", category: "taste" },
  { name: "fruchtig", category: "taste" },
  { name: "erfrischend", category: "taste" },
  { name: "herzhaft", category: "taste" },
  { name: "cremig", category: "taste" },
  { name: "knusprig", category: "taste" },
  { name: "rauchig", category: "taste" },
  { name: "karamellig", category: "taste" },
  { name: "buttrig", category: "taste" },
  { name: "pikant", category: "taste" },

  // Alkohol — 2 (nur im Drink-Modus sichtbar)
  { name: "alkoholisch", category: "alcohol" },
  { name: "alkoholfrei", category: "alcohol" },

  // Anlass — 23 (löst Dropdown-Anzeige aus, da >20)
  { name: "schnell", category: "occasion" },
  { name: "meal-prep", category: "occasion" },
  { name: "gäste-tauglich", category: "occasion" },
  { name: "familienessen", category: "occasion" },
  { name: "romantisches-dinner", category: "occasion" },
  { name: "sonntagsbraten", category: "occasion" },
  { name: "picknick", category: "occasion" },
  { name: "grillen", category: "occasion" },
  { name: "weihnachten", category: "occasion" },
  { name: "ostern", category: "occasion" },
  { name: "geburtstag", category: "occasion" },
  { name: "silvester", category: "occasion" },
  { name: "karneval", category: "occasion" },
  { name: "brunch", category: "occasion" },
  { name: "buffet", category: "occasion" },
  { name: "sommer", category: "occasion" },
  { name: "winter", category: "occasion" },
  { name: "herbst", category: "occasion" },
  { name: "frühling", category: "occasion" },
  { name: "sport-snack", category: "occasion" },
  { name: "resteverwertung", category: "occasion" },
  { name: "one-pot", category: "occasion" },
  { name: "backen", category: "occasion" },
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

  // 1b. Migrationen für Spalten, die nachträglich hinzukamen.
  // CREATE TABLE IF NOT EXISTS legt KEINE neuen Spalten auf bestehende
  // Tabellen drauf. Daher hier explizit per ALTER TABLE — wenn die Spalte
  // schon existiert, wirft SQLite einen "duplicate column"-Fehler, den
  // wir ignorieren können.
  for (const alter of [
    `ALTER TABLE recipes ADD COLUMN kind TEXT NOT NULL DEFAULT 'food'`,
  ]) {
    try {
      rawDb.execSync(alter);
    } catch {
      // Spalte schon vorhanden — passt, ignorieren.
    }
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
