// Konvertiert den Bundeslebensmittelschlüssel (BLS 4.0) in einen schlanken
// Auszug, der in der App gebündelt wird.
//
// Quelle: BLS_4_0_Daten_2025_DE.xlsx (7.140 Lebensmittel × 138 Nährstoffe,
//   © Max Rubner-Institut, lizenziert unter CC BY 4.0).
//   Download: https://www.blsdb.de/  →  https://blsdb.de/download
//
// Wir reduzieren die 138 Nährstoffe (× 3 Spalten Wert/Herkunft/Referenz) auf
// die 6 Werte, die die App berechnet — das schrumpft 13,7 MB XLSX auf <1 MB JSON.
//
// Ausgabe: app/assets/data/bls_foods.json
//   [{ code, name, kcal, protein, carbs, fat, fiber, sugar }, ...]
//   Werte pro 100 g. Fehlende Messwerte bleiben `null` (NICHT 0), damit die
//   App "unbekannt" von "echt null" unterscheiden kann.
//
// Einmalig / bei BLS-Update ausführen:
//   1. BLS_4_0_Daten_2025_DE.xlsx nach scripts/bls-source/ kopieren
//      (oder Pfad als Argument übergeben)
//   2. cd scripts && npm install && npm run bls

import xlsx from "xlsx";
import fs from "node:fs";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// Eingabe: 1. Argument, sonst Default in scripts/bls-source/
const INPUT =
  process.argv[2] ??
  join(HERE, "bls-source", "BLS_4_0_Daten_2025_DE.xlsx");

const OUT_DIR = join(HERE, "..", "app", "assets", "data");
const OUT_FILE = join(OUT_DIR, "bls_foods.json");

// Nährstoff-Codes laut BLS-Components-Tabelle:
//   ENERCC  = Energie (kcal)        PROT625 = Protein (N×6,25)
//   FAT     = Fett                  CHO     = Kohlenhydrate, verfügbar
//   FIBT    = Ballaststoffe, gesamt SUGAR   = Zucker (Mono-/Disaccharide)
const NUTRIENT_CODES = {
  kcal: "ENERCC",
  protein: "PROT625",
  fat: "FAT",
  carbs: "CHO",
  fiber: "FIBT",
  sugar: "SUGAR",
};

if (!fs.existsSync(INPUT)) {
  console.error(`\n❌ BLS-Datei nicht gefunden:\n   ${INPUT}\n`);
  console.error(
    "Lege BLS_4_0_Daten_2025_DE.xlsx in scripts/bls-source/ ab\n" +
      "oder gib den Pfad als Argument an:\n" +
      "   npm run bls -- \"C:\\\\Pfad\\\\zu\\\\BLS_4_0_Daten_2025_DE.xlsx\"\n",
  );
  process.exit(1);
}

console.log("Lese", INPUT, "…");
const wb = xlsx.readFile(INPUT);
const ws = wb.Sheets[wb.SheetNames[0]];
const range = xlsx.utils.decode_range(ws["!ref"]);

// Header-Zeile (Zeile 0) einlesen
const headers = [];
for (let c = 0; c <= range.e.c; c++) {
  const cell = ws[xlsx.utils.encode_cell({ r: 0, c })];
  headers.push(cell ? String(cell.v) : "");
}

// Wert-Spalte je Nährstoff finden: Header beginnt mit "<CODE> " UND enthält
// "/100g]". So treffen wir die Wert-Spalte, nicht "<CODE> Datenherkunft"/"Referenz".
function findValueColumn(code) {
  for (let c = 0; c < headers.length; c++) {
    if (headers[c].startsWith(code + " ") && headers[c].includes("/100g]")) {
      return c;
    }
  }
  throw new Error(`Spalte für Nährstoff-Code "${code}" nicht gefunden`);
}

const cols = { code: 0, name: 1 };
for (const [field, code] of Object.entries(NUTRIENT_CODES)) {
  cols[field] = findValueColumn(code);
}

const cell = (r, c) => {
  const cc = ws[xlsx.utils.encode_cell({ r, c })];
  return cc ? cc.v : null;
};

// Zahl normalisieren. kcal → ganze Zahl, Makros → 1 Nachkommastelle
// (so wie die App ohnehin rundet). Nicht-Zahlen / leer → null.
function toNumber(v, decimals) {
  if (v == null || v === "") return null;
  const f = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  if (!Number.isFinite(f)) return null;
  const p = 10 ** decimals;
  return Math.round(f * p) / p;
}

const foods = [];
const missing = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };

for (let r = 1; r <= range.e.r; r++) {
  const code = cell(r, cols.code);
  const name = cell(r, cols.name);
  if (!code || !name) continue;

  const entry = {
    code: String(code),
    name: String(name).trim(),
    kcal: toNumber(cell(r, cols.kcal), 0),
    protein: toNumber(cell(r, cols.protein), 1),
    carbs: toNumber(cell(r, cols.carbs), 1),
    fat: toNumber(cell(r, cols.fat), 1),
    fiber: toNumber(cell(r, cols.fiber), 1),
    sugar: toNumber(cell(r, cols.sugar), 1),
  };
  for (const k of Object.keys(missing)) if (entry[k] == null) missing[k]++;
  foods.push(entry);
}

// Stabil nach Name sortieren — macht das committete JSON diff-freundlich.
foods.sort((a, b) => a.name.localeCompare(b.name, "de"));

fs.mkdirSync(OUT_DIR, { recursive: true });
const json = JSON.stringify(foods);
fs.writeFileSync(OUT_FILE, json);

const gz = zlib.gzipSync(Buffer.from(json));
const kb = (b) => (b / 1024).toFixed(0) + " KB";

console.log(`\n✅ ${foods.length} Lebensmittel geschrieben → ${OUT_FILE}`);
console.log(`   Spalten: ${JSON.stringify(cols)}`);
console.log(`   Größe: ${kb(json.length)} (JSON) / ${kb(gz.length)} (gzip, ~im APK)`);
console.log("   Fehlende Werte (bleiben null):", JSON.stringify(missing));
