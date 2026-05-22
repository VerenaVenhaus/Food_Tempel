// Datenbank-Verbindung — Lazy Singleton.
//
// Wichtig: Wir öffnen die SQLite-Datei NICHT mehr beim Modul-Import,
// sondern erst beim ersten Aufruf von getDb(). Grund: Auf Plattformen, wo
// SQLite nicht verfügbar ist (z.B. Browser ohne SharedArrayBuffer), würde
// ein Top-Level-Aufruf den ganzen Modul-Import killen — und damit auch
// alles, was diese Datei importiert (also so gut wie alles in unserer App).
//
// Mit Lazy-Init kann die App wenigstens hochkommen, einen Splash-Screen
// zeigen, und wenn die DB scheitert, sehen wir den echten Fehler im UI
// statt einen weißen Bildschirm.

import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import * as SQLite from "expo-sqlite";

import * as schema from "./schema";

const DB_FILENAME = "food_tempel.db";

let _sqliteDb: SQLite.SQLiteDatabase | null = null;
let _drizzleDb: ExpoSQLiteDatabase<typeof schema> | null = null;

function open(): void {
  if (_sqliteDb && _drizzleDb) return;

  _sqliteDb = SQLite.openDatabaseSync(DB_FILENAME, {
    enableChangeListener: true,
  });
  // Foreign-Key-Constraints aktivieren — SQLite hat die historisch standardmäßig AUS.
  _sqliteDb.execSync("PRAGMA foreign_keys = ON;");
  _drizzleDb = drizzle(_sqliteDb, { schema });
}

/**
 * Drizzle-Wrapper mit Type-Safety. Verwendet überall in Repositories.
 * Öffnet die DB beim ersten Aufruf.
 */
export function getDb(): ExpoSQLiteDatabase<typeof schema> {
  if (!_drizzleDb) open();
  return _drizzleDb!;
}

/**
 * Rohe SQLite-Verbindung — nur für init.ts (CREATE TABLE Statements).
 */
export function getRawDb(): SQLite.SQLiteDatabase {
  if (!_sqliteDb) open();
  return _sqliteDb!;
}
