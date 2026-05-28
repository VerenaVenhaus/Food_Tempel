// Befüllt die bls_foods-Tabelle mit dem gebündelten BLS-Auszug
// (app/assets/data/bls_foods.json, erzeugt von scripts/convert-bls.mjs).
//
// Aufgerufen aus initDatabase() beim App-Start. Läuft idempotent: nur beim
// ersten Start oder nach einer neuen Datenversion wird wirklich befüllt.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { getRawDb } from "./client";

// Bei jeder NEUEN BLS-Datendatei (neuer Lauf von `npm run bls`) ODER Änderung
// der gespeicherten Spalten hochzählen. Stimmt die gespeicherte Version nicht
// mit dieser überein, wird die Tabelle geleert und frisch befüllt.
// v2: name_compact-Spalte ergänzt (Phase 3).
export const BLS_DATASET_VERSION = "bls-4.0-2025-2";

const VERSION_KEY = "bls_dataset_version";

// Eine Zeile, so wie sie in bls_foods.json steht (Werte pro 100 g,
// fehlende Messwerte = null).
type BlsRow = {
  code: string;
  name: string;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
};

/**
 * Normalisiert einen Lebensmittel-Namen für die Suche: klein geschrieben +
 * deutsche Umlaute gefaltet (ä→a, ö→o, ü→u, ß→ss). So findet die Suche nach
 * "apfel" auch "Äpfel", und Groß-/Kleinschreibung spielt keine Rolle.
 *
 * Bewusst OHNE String.normalize(): Hermes (unser Release-Build) unterstützt
 * Unicode-Normalisierung nicht zuverlässig. Für deutsche BLS-Namen reichen
 * die vier Umlaut-Ersetzungen.
 */
export function normalizeBlsSearch(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .trim();
}

/**
 * Verdichtet einen bereits normalisierten Namen weiter: entfernt alles außer
 * a–z und 0–9 (Leerzeichen, Kommas, Bindestriche). Damit findet die Suche
 * nach "haferflocken" auch den BLS-Eintrag "Hafer Flocken" (mit Leerzeichen).
 */
export function compactBlsSearch(normalized: string): string {
  return normalized.replace(/[^a-z0-9]/g, "");
}

/**
 * Lädt die gebündelten BLS-Daten in die bls_foods-Tabelle — aber nur wenn
 * nötig (erster Start oder neue Datenversion).
 *
 * require() statt import: Das ~7.140-Einträge-Array wird so NUR konstruiert,
 * wenn wir tatsächlich (neu) befüllen. Bei normalen Starts vergleichen wir
 * nur zwei Versions-Strings und fassen die große JSON nie an — das spart
 * Speicher und Startzeit. (Kein dynamisches import(): das bringt Hermes beim
 * Release-Build zum Absturz, siehe Supabase-Hermes-Patch.)
 */
export async function seedBlsFoods(): Promise<void> {
  const db = getRawDb();

  const storedVersion = await AsyncStorage.getItem(VERSION_KEY);
  const count =
    db.getFirstSync<{ c: number }>("SELECT count(*) AS c FROM bls_foods")?.c ??
    0;

  // Schon aktuell? Dann nichts tun — und die große JSON gar nicht erst laden.
  if (storedVersion === BLS_DATASET_VERSION && count > 0) return;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rows = require("../../assets/data/bls_foods.json") as unknown as BlsRow[];

  db.withTransactionSync(() => {
    // Bei Versions-Update alten Bestand entfernen, dann frisch einfügen.
    db.execSync("DELETE FROM bls_foods;");
    const stmt = db.prepareSync(
      `INSERT INTO bls_foods
         (code, name, name_search, name_compact, kcal, protein, carbs, fat, fiber, sugar)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    try {
      for (const r of rows) {
        const search = normalizeBlsSearch(r.name);
        stmt.executeSync([
          r.code,
          r.name,
          search,
          compactBlsSearch(search),
          r.kcal,
          r.protein,
          r.carbs,
          r.fat,
          r.fiber,
          r.sugar,
        ]);
      }
    } finally {
      stmt.finalizeSync();
    }
  });

  await AsyncStorage.setItem(VERSION_KEY, BLS_DATASET_VERSION);
}
