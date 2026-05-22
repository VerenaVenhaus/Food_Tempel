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
 * Konvertiert eine Mengenangabe nach Gramm (grob geschätzt).
 * Für genaue Werte müsste man Dichten/Zutaten kennen — wir nehmen Defaults,
 * die für die meisten Zutaten passen.
 */
export function convertToGrams(quantity: number, unit: string | null): number {
  if (!unit) return quantity;
  const u = unit.trim().toLowerCase();

  // Gewicht
  if (u === "g" || u === "gramm") return quantity;
  if (u === "kg") return quantity * 1000;
  if (u === "mg") return quantity / 1000;

  // Volumen — pro 1 ml etwa 1 g (gilt für Wasser, Brühe, etc.; bei Öl/Honig stimmt's nicht ganz)
  if (u === "ml") return quantity;
  if (u === "l" || u === "liter") return quantity * 1000;

  // Küchen-Maße (grobe Defaults)
  if (u === "tl" || u === "teelöffel") return quantity * 5;
  if (u === "el" || u === "esslöffel") return quantity * 15;
  if (u === "tasse" || u === "cup") return quantity * 240;
  if (u === "prise") return quantity * 0.3;

  // Stück / unbekannt → konservativ schätzen (durchschnittliche Zutat ~50g)
  if (u === "stück" || u === "stk" || u === "pcs") return quantity * 50;

  // Default: behandle als g (fail-safe)
  return quantity;
}
