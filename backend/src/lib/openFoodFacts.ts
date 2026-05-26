// Open Food Facts: kostenlose Lebensmittel-Datenbank.
// API-Doku: https://openfoodfacts.github.io/openfoodfacts-server/api/
// Keine Auth nötig, nur "User-Agent" empfohlen.

const API_BASE = "https://world.openfoodfacts.org";

// Welche Felder von der Search-API wir holen — weniger Daten = schneller.
const FIELDS = "product_name,nutriments,categories_tags,nutrition_grades";

export type Nutriments = {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  sugarPer100g: number;
};

/**
 * Sucht ein Produkt nach Namen. Gibt die Nährwerte des Top-Treffers zurück,
 * oder null wenn nichts gefunden wurde.
 */
export async function searchProductNutriments(
  name: string,
): Promise<Nutriments | null> {
  const url =
    `${API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(name)}` +
    `&search_simple=1&action=process&json=1&page_size=3&fields=${FIELDS}` +
    `&lc=de`; // bevorzugt deutsche Treffer

  const response = await fetch(url, {
    headers: {
      "User-Agent": "FoodTempel/0.1 (https://food-tempel.app)",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    products?: Array<{ nutriments?: Record<string, number> }>;
  };

  // Ersten Treffer mit echten Nährwerten suchen — manche Produkte haben
  // keine Daten erfasst.
  for (const product of data.products ?? []) {
    const n = product.nutriments;
    if (!n) continue;
    // "energy-kcal_100g" ist die Kalorienangabe pro 100g
    const calories = n["energy-kcal_100g"];
    if (calories == null) continue;
    return {
      caloriesPer100g: calories,
      proteinPer100g: n["proteins_100g"] ?? 0,
      carbsPer100g: n["carbohydrates_100g"] ?? 0,
      fatPer100g: n["fat_100g"] ?? 0,
      fiberPer100g: n["fiber_100g"] ?? 0,
      sugarPer100g: n["sugars_100g"] ?? 0,
    };
  }

  return null;
}

/**
 * Konvertiert eine Mengenangabe nach Gramm.
 *
 * Liefert `null`, wenn die Einheit komplett unbekannt ist — der Caller soll
 * dann lieber die Zutat als "nicht berechnet" markieren statt stillschweigend
 * Müll-Werte einzurechnen. (Früher fielen unbekannte Einheiten auf "behandle
 * als g" zurück, was z.B. "1 Bund Petersilie" als 1g rechnete.)
 *
 * Die Default-Werte sind bewusst grob — Küchen-Maße variieren stark je nach
 * Zutat. Wer's genau braucht, gibt direkt Gramm ein.
 */
export function convertToGrams(
  quantity: number,
  unit: string | null,
): number | null {
  // Keine Einheit angegeben → wir nehmen die Zahl als Gramm an. Üblich bei
  // "200 Mehl" ohne Einheit, der User meinte fast immer Gramm.
  if (!unit) return quantity;
  const u = unit.trim().toLowerCase();
  if (u === "") return quantity;

  // Gewicht
  if (u === "g" || u === "gramm" || u === "gr") return quantity;
  if (u === "kg" || u === "kilogramm") return quantity * 1000;
  if (u === "mg") return quantity / 1000;

  // Volumen — 1 ml ≈ 1 g (gilt für Wasser, Brühe, Milch; bei Öl/Honig
  // grob daneben, dafür müsste man Dichten kennen)
  if (u === "ml" || u === "milliliter") return quantity;
  if (u === "l" || u === "liter") return quantity * 1000;
  if (u === "cl" || u === "centiliter") return quantity * 10;

  // Klassische Küchen-Löffel & -Maße
  if (u === "tl" || u === "teelöffel") return quantity * 5;
  if (u === "el" || u === "esslöffel") return quantity * 15;
  if (u === "tasse" || u === "cup" || u === "cups") return quantity * 240;
  if (u === "becher") return quantity * 200;
  if (u === "prise") return quantity * 0.3;
  if (u === "messerspitze" || u === "msp") return quantity * 0.5;
  if (u === "schuss") return quantity * 5;
  if (u === "spritzer") return quantity * 2;

  // Stück-basierte Einheiten
  if (u === "stück" || u === "stk" || u === "pcs" || u === "st")
    return quantity * 50;
  if (u === "zehe" || u === "zehen") return quantity * 5; // Knoblauch
  if (u === "scheibe" || u === "scheiben") return quantity * 25; // Brot/Käse
  if (u === "blatt" || u === "blätter") return quantity * 5; // Lasagne, Salbei
  if (u === "zweig" || u === "zweige") return quantity * 1; // Thymian, Rosmarin
  if (u === "bund") return quantity * 30; // Petersilie & Co.
  if (u === "stange" || u === "stangen") return quantity * 200; // Lauch, Sellerie
  if (u === "handvoll") return quantity * 30;
  if (u === "kopf" || u === "köpfe") return quantity * 250; // Salatkopf
  if (u === "knolle" || u === "knollen") return quantity * 80;
  if (u === "kugel" || u === "kugeln") return quantity * 50; // Eiskugel
  if (u === "schale" || u === "schalen") return quantity * 150;

  // Verpackungseinheiten
  if (u === "dose" || u === "dosen") return quantity * 200;
  if (u === "glas" || u === "gläser") return quantity * 200;
  if (u === "flasche" || u === "flaschen") return quantity * 250;
  if (u === "tüte" || u === "tüten") return quantity * 250;
  if (u === "packung" || u === "packungen") return quantity * 500;
  if (u === "päckchen") return quantity * 8; // Vanillezucker o.ä.
  if (u === "würfel") return quantity * 42; // Frischhefe-Würfel
  if (u === "riegel") return quantity * 100;
  if (u === "tafel") return quantity * 100; // Schokolade

  // Unbekannte Einheit → null, damit der Aufrufer das als "fehlt" flaggen kann
  return null;
}
