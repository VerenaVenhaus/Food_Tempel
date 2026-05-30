// Wandelt eine Mengenangabe in Gramm um. Identische Logik wie im Backend
// (backend/src/lib/openFoodFacts.ts) — bewusst dupliziert, damit die App
// Nährwerte auch komplett offline rechnen kann, wenn alle Zutaten einen
// BLS-Code haben.
//
// Liefert `null`, wenn die Einheit unbekannt ist — der Aufrufer soll die
// Zutat dann als "nicht berechnet" markieren statt stillschweigend Müll-
// Werte einzurechnen (sonst würde "1 Bund Petersilie" als 1g gerechnet).
//
// Die Default-Werte sind bewusst grob — Küchen-Maße variieren stark je
// nach Zutat. Wer's genau braucht, gibt direkt Gramm ein.

export function convertToGrams(
  quantity: number,
  unit: string | null,
): number | null {
  // Keine Einheit → Zahl als Gramm interpretieren ("200 Mehl" meint fast
  // immer 200 g).
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
  if (u === "kelle" || u === "schöpfkelle") return quantity * 80;
  if (u === "prise") return quantity * 0.3;
  if (u === "messerspitze" || u === "msp") return quantity * 0.5;
  if (u === "schuss") return quantity * 5;
  if (u === "spritzer") return quantity * 2;
  if (u === "tropfen") return quantity * 0.05; // Bittermandel, Aroma

  // Stück-basierte Einheiten
  if (u === "stück" || u === "stk" || u === "pcs" || u === "st")
    return quantity * 50;
  if (u === "zehe" || u === "zehen") return quantity * 5; // Knoblauch
  if (u === "scheibe" || u === "scheiben") return quantity * 25; // Brot/Käse
  if (u === "blatt" || u === "blätter") return quantity * 5; // Lasagne, Salbei
  if (u === "zweig" || u === "zweige") return quantity * 1; // Thymian, Rosmarin
  if (u === "rispe" || u === "rispen") return quantity * 150; // Strauchtomaten
  if (u === "stiel" || u === "stiele") return quantity * 40; // Sellerie
  if (u === "spalte" || u === "spalten") return quantity * 25; // Apfel-, Orangenspalte
  if (u === "ring" || u === "ringe") return quantity * 8; // Zwiebel-, Paprika-Ring
  if (u === "streifen") return quantity * 15;
  if (u === "stick" || u === "sticks") return quantity * 4; // Zimt-Stick
  if (u === "bund") return quantity * 30; // Petersilie & Co.
  if (u === "stange" || u === "stangen") return quantity * 200; // Lauch, Sellerie
  if (u === "handvoll") return quantity * 30;
  if (u === "kopf" || u === "köpfe") return quantity * 250; // Salatkopf
  if (u === "knolle" || u === "knollen") return quantity * 80;
  if (u === "kugel" || u === "kugeln") return quantity * 50; // Eiskugel
  if (u === "schale" || u === "schalen") return quantity * 150;
  if (u === "filet" || u === "filets") return quantity * 150; // Fisch, Geflügel
  if (u === "brust" || u === "brüste") return quantity * 180; // Hähnchen
  if (u === "keule" || u === "keulen") return quantity * 220;
  if (u === "schenkel") return quantity * 180;
  if (u === "hälfte" || u === "hälften") return quantity * 100;
  if (u === "viertel") return quantity * 60;
  if (u === "portion" || u === "portionen") return quantity * 200;

  // Verpackungseinheiten
  if (u === "dose" || u === "dosen") return quantity * 200;
  if (u === "glas" || u === "gläser") return quantity * 200;
  if (u === "flasche" || u === "flaschen") return quantity * 250;
  if (u === "tüte" || u === "tüten") return quantity * 250;
  if (u === "beutel") return quantity * 100; // Tee, Soßenbeutel etc. — sehr grob
  if (u === "packung" || u === "packungen" || u === "pkg") return quantity * 500;
  if (u === "päckchen") return quantity * 8; // Vanillezucker o.ä.
  if (u === "würfel") return quantity * 42; // Frischhefe-Würfel
  if (u === "riegel") return quantity * 100;
  if (u === "tafel") return quantity * 100; // Schokolade

  // Unbekannte Einheit → null, damit der Aufrufer das als "fehlt" flaggen kann
  return null;
}
