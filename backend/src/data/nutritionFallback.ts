// Bundled Nährwerte für häufige rohe Zutaten.
//
// Wird VOR der Open-Food-Facts-Suche konsultiert. Vorteile:
// - Genauer für rohe Zutaten (OFF liefert sonst gern "Apfelsaft" für "Apfel")
// - Sofort, ohne API-Call
// - Funktioniert auch bei OFF-Ausfällen
//
// Werte pro 100 g, gerundet aus USDA Foundation Foods, Bundeslebensmittel-
// schlüssel-Auszügen und allgemeinen Nährwertdatenbanken. Quellen variieren
// je nach Saison/Sorte um ~10%, das ist für eine Rezeptenetto-Schätzung
// vollkommen ausreichend.
//
// Die Schlüssel müssen exakt mit `app/src/data/commonIngredients.ts`
// übereinstimmen, damit die Autocomplete-Auswahl in der App hier auch
// landet. Aliasse (z.B. "Amaranth" → "Amarant") via NUTRITION_ALIASES.

export type IngredientNutriments = {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  sugarPer100g: number;
};

const n = (
  cal: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number,
  sugar: number,
): IngredientNutriments => ({
  caloriesPer100g: cal,
  proteinPer100g: protein,
  carbsPer100g: carbs,
  fatPer100g: fat,
  fiberPer100g: fiber,
  sugarPer100g: sugar,
});

export const NUTRITION_FALLBACK: Record<string, IngredientNutriments> = {
  // -- Obst --
  Apfel: n(52, 0.3, 14, 0.2, 2.4, 10),
  Birne: n(57, 0.4, 15, 0.1, 3.1, 10),
  Banane: n(89, 1.1, 23, 0.3, 2.6, 12),
  Orange: n(47, 0.9, 12, 0.1, 2.4, 9),
  Mandarine: n(53, 0.8, 13, 0.3, 1.8, 11),
  Zitrone: n(29, 1.1, 9, 0.3, 2.8, 2.5),
  Limette: n(30, 0.7, 11, 0.2, 2.8, 2),
  Grapefruit: n(42, 0.8, 11, 0.1, 1.6, 7),
  Kiwi: n(61, 1.1, 15, 0.5, 3, 9),
  Ananas: n(50, 0.5, 13, 0.1, 1.4, 10),
  Mango: n(60, 0.8, 15, 0.4, 1.6, 14),
  Pfirsich: n(39, 0.9, 10, 0.3, 1.5, 8),
  Aprikose: n(48, 1.4, 11, 0.4, 2, 9),
  Pflaume: n(46, 0.7, 11, 0.3, 1.4, 10),
  Kirsche: n(63, 1.1, 16, 0.2, 2.1, 13),
  Trauben: n(69, 0.7, 18, 0.2, 0.9, 16),
  Erdbeere: n(32, 0.7, 8, 0.3, 2, 5),
  Heidelbeere: n(57, 0.7, 14, 0.3, 2.4, 10),
  Himbeere: n(52, 1.2, 12, 0.7, 6.5, 4.4),
  Brombeere: n(43, 1.4, 10, 0.5, 5.3, 5),
  Wassermelone: n(30, 0.6, 8, 0.2, 0.4, 6),

  // -- Gemüse --
  Tomate: n(18, 0.9, 3.9, 0.2, 1.2, 2.6),
  Cherrytomate: n(18, 0.9, 3.9, 0.2, 1.2, 2.6),
  Zwiebel: n(40, 1.1, 9, 0.1, 1.7, 4.2),
  Knoblauchzehe: n(149, 6.4, 33, 0.5, 2.1, 1),
  Karotte: n(41, 0.9, 10, 0.2, 2.8, 4.7),
  Sellerie: n(16, 0.7, 3, 0.2, 1.6, 1.3),
  Lauch: n(61, 1.5, 14, 0.3, 1.8, 3.9),
  Frühlingszwiebel: n(32, 1.8, 7.3, 0.2, 2.6, 2.3),
  Paprika: n(31, 1, 6, 0.3, 2.1, 4.2),
  Gurke: n(16, 0.7, 3.6, 0.1, 0.5, 1.7),
  Zucchini: n(17, 1.2, 3.1, 0.3, 1, 2.5),
  Aubergine: n(25, 1, 6, 0.2, 3, 3.5),
  Kürbis: n(26, 1, 6.5, 0.1, 0.5, 2.8),
  Kartoffel: n(77, 2, 17, 0.1, 2.2, 0.8),
  Süßkartoffel: n(86, 1.6, 20, 0.1, 3, 4.2),
  Pastinake: n(75, 1.2, 18, 0.3, 4.9, 4.8),
  "Rote Bete": n(43, 1.6, 10, 0.2, 2.8, 7),
  Brokkoli: n(34, 2.8, 7, 0.4, 2.6, 1.7),
  Blumenkohl: n(25, 1.9, 5, 0.3, 2, 1.9),
  Rosenkohl: n(43, 3.4, 9, 0.3, 3.8, 2.2),
  Spinat: n(23, 2.9, 3.6, 0.4, 2.2, 0.4),
  Mangold: n(19, 1.8, 3.7, 0.2, 1.6, 1.1),
  Champignon: n(22, 3.1, 3.3, 0.3, 1, 2),
  Steinpilz: n(38, 3.7, 6, 0.7, 3, 2),
  Pfifferling: n(38, 1.5, 7, 0.5, 4, 1.2),
  Mais: n(86, 3.3, 19, 1.2, 2.7, 6.3),
  Erbsen: n(81, 5.4, 14, 0.4, 5.7, 5.7),
  "Grüne Bohnen": n(31, 1.8, 7, 0.2, 2.7, 3.3),

  // -- Salat & Kräuter --
  Kopfsalat: n(15, 1.4, 2.9, 0.2, 1.3, 0.8),
  Eisbergsalat: n(14, 0.9, 3, 0.1, 1.2, 2),
  Feldsalat: n(21, 2, 3.6, 0.4, 1.5, 0.4),
  Rucola: n(25, 2.6, 3.7, 0.7, 1.6, 2),
  Petersilie: n(36, 3, 6.3, 0.8, 3.3, 0.9),
  Basilikum: n(23, 3.2, 2.7, 0.6, 1.6, 0.3),
  Schnittlauch: n(30, 3.3, 4.4, 0.7, 2.5, 1.9),
  Dill: n(43, 3.5, 7, 1.1, 2.1, 0),
  Thymian: n(101, 5.6, 24, 1.7, 14, 0),
  Rosmarin: n(131, 3.3, 21, 5.9, 14, 0),
  Salbei: n(315, 11, 61, 13, 40, 1.7),
  Oregano: n(265, 9, 69, 4.3, 43, 4.1),
  Minze: n(70, 3.8, 15, 0.9, 8, 0),
  Koriander: n(23, 2.1, 3.7, 0.5, 2.8, 0.9),

  // -- Fleisch & Geflügel --
  Hähnchenbrust: n(165, 31, 0, 3.6, 0, 0),
  Hähnchenschenkel: n(209, 18, 0, 15, 0, 0),
  Putenbrust: n(135, 30, 0, 1, 0, 0),
  "Hackfleisch gemischt": n(250, 17, 0, 20, 0, 0),
  Rinderhack: n(254, 17, 0, 20, 0, 0),
  Schweinehack: n(263, 17, 0, 21, 0, 0),
  Rindersteak: n(271, 26, 0, 18, 0, 0),
  Schweinefilet: n(143, 26, 0, 4, 0, 0),
  Schweinebauch: n(518, 9, 0, 53, 0, 0),
  Speck: n(541, 37, 1.4, 42, 0, 1.4),
  Schinken: n(145, 21, 1.5, 6, 0, 1.5),
  Salami: n(425, 22, 1.6, 36, 0, 1.6),
  Wurst: n(300, 12, 2, 27, 0, 1),

  // -- Fisch & Meeresfrüchte --
  Lachs: n(208, 20, 0, 13, 0, 0),
  Thunfisch: n(144, 30, 0, 1, 0, 0),
  Forelle: n(119, 20, 0, 3.5, 0, 0),
  Kabeljau: n(82, 18, 0, 0.7, 0, 0),
  Hering: n(158, 18, 0, 9, 0, 0),
  Garnele: n(99, 24, 0.2, 0.3, 0, 0),
  Tintenfisch: n(92, 16, 3, 1.4, 0, 0),
  Muscheln: n(86, 12, 4, 2, 0, 0),

  // -- Milchprodukte & Eier --
  Milch: n(64, 3.4, 4.8, 3.5, 0, 4.8),
  Sahne: n(290, 2.4, 3.4, 30, 0, 3.4),
  Schmand: n(244, 2.5, 4, 24, 0, 3),
  "Crème fraîche": n(295, 2.4, 2.6, 30, 0, 2.6),
  "Saure Sahne": n(168, 2.8, 3.6, 16, 0, 3.6),
  Joghurt: n(59, 3.4, 4.7, 3.3, 0, 4.7),
  Quark: n(78, 13, 3.6, 0.2, 0, 3.6),
  Buttermilch: n(35, 3.6, 4, 0.5, 0, 4),
  Butter: n(717, 0.9, 0.1, 81, 0, 0.1),
  Margarine: n(717, 0.2, 0.5, 80, 0, 0.5),
  Ei: n(143, 13, 0.7, 10, 0, 0.7),
  Eigelb: n(322, 16, 3.6, 27, 0, 0.6),
  Eiweiß: n(52, 11, 0.7, 0.2, 0, 0.7),

  // -- Käse --
  Mozzarella: n(280, 18, 2, 22, 0, 1),
  Parmesan: n(392, 36, 3.2, 26, 0, 0.9),
  Feta: n(264, 14, 4, 21, 0, 4),
  Gouda: n(356, 25, 2.2, 27, 0, 2.2),
  Cheddar: n(403, 25, 1.3, 33, 0, 0.5),
  Frischkäse: n(342, 5.9, 4, 34, 0, 3),
  Ricotta: n(174, 11, 3, 13, 0, 0.3),
  Bergkäse: n(387, 26, 0, 31, 0, 0),
  Gorgonzola: n(353, 21, 0, 29, 0, 0),

  // -- Brot & Backwaren --
  Toast: n(290, 9, 50, 5, 3, 3),
  Brot: n(250, 8, 45, 3, 3, 3),
  Brötchen: n(270, 9, 53, 3, 3, 2),
  Baguette: n(263, 9, 51, 3, 2.5, 2),
  Wrap: n(290, 8, 52, 7, 2.5, 2),
  Tortilla: n(220, 6, 36, 6, 3, 1),

  // -- Getreide & Hülsenfrüchte (trocken/roh) --
  Haferflocken: n(379, 13, 67, 7, 10, 1),
  Müsli: n(380, 10, 65, 8, 7, 15),
  Cornflakes: n(357, 7, 84, 0.4, 3, 8),
  Couscous: n(376, 13, 77, 0.6, 5, 0.2),
  Bulgur: n(342, 12, 76, 1.3, 18, 0.4),
  Quinoa: n(368, 14, 64, 6, 7, 0),
  Amarant: n(371, 14, 65, 7, 7, 1.7),
  Hirse: n(378, 11, 73, 4.2, 8.5, 0),
  Reis: n(365, 7, 80, 0.7, 1.3, 0),
  Milchreis: n(358, 7, 79, 0.6, 1.4, 0),
  Wildreis: n(357, 14, 75, 1.1, 6, 2.5),
  Risottoreis: n(358, 7, 79, 0.6, 1.4, 0),
  Linsen: n(353, 25, 60, 1.1, 11, 2),
  Kichererbsen: n(364, 19, 61, 6, 17, 11),
  "Weiße Bohnen": n(333, 24, 60, 0.9, 16, 2),
  Kidneybohnen: n(333, 24, 60, 0.8, 25, 2),

  // -- Nudeln (trocken) --
  Spaghetti: n(371, 13, 75, 1.5, 3, 3),
  Penne: n(371, 13, 75, 1.5, 3, 3),
  Tagliatelle: n(371, 13, 75, 1.5, 3, 3),
  Lasagneblätter: n(371, 13, 75, 1.5, 3, 3),
  Tortellini: n(320, 13, 50, 8, 2, 3),
  "Asia-Nudeln": n(345, 9, 73, 2, 2, 2),

  // -- Backzutaten --
  Mehl: n(364, 10, 76, 1, 2.7, 0.3),
  Vollkornmehl: n(339, 13, 72, 1.9, 11, 0.4),
  Stärke: n(381, 0.3, 95, 0.1, 0, 0),
  Zucker: n(387, 0, 100, 0, 0, 100),
  "Brauner Zucker": n(380, 0, 98, 0, 0, 97),
  Puderzucker: n(387, 0, 100, 0, 0, 100),
  Vanillezucker: n(387, 0, 99, 0, 0, 95),
  Backpulver: n(53, 0, 28, 0, 0.2, 0),
  Natron: n(0, 0, 0, 0, 0, 0),
  Hefe: n(105, 7, 11, 1.5, 5, 0),
  Trockenhefe: n(295, 40, 41, 8, 27, 0),
  Honig: n(304, 0.3, 82, 0, 0.2, 82),
  Ahornsirup: n(260, 0, 67, 0.2, 0, 60),

  // -- Gewürze --
  Salz: n(0, 0, 0, 0, 0, 0),
  Pfeffer: n(251, 10, 64, 3, 25, 0.6),
  "Paprika edelsüß": n(282, 14, 54, 13, 35, 10),
  "Paprika scharf": n(318, 12, 56, 17, 28, 10),
  Curry: n(325, 14, 56, 14, 53, 3),
  Kreuzkümmel: n(375, 18, 44, 22, 11, 2),
  "Koriander gemahlen": n(298, 12, 55, 18, 42, 0),
  Muskat: n(525, 6, 49, 36, 21, 28),
  Zimt: n(247, 4, 81, 1.2, 53, 2.2),
  Nelken: n(274, 6, 66, 13, 34, 2.4),
  Lorbeerblatt: n(313, 8, 75, 8, 26, 0),
  Kümmel: n(333, 20, 50, 14, 38, 0),
  Chili: n(282, 14, 54, 13, 35, 10),
  Cayennepfeffer: n(318, 12, 56, 17, 28, 10),
  Knoblauchpulver: n(331, 17, 73, 0.7, 9, 2.4),
  Zwiebelpulver: n(341, 10, 79, 1, 15, 6),
  Ingwer: n(80, 1.8, 18, 0.8, 2, 1.7),
  Kurkuma: n(354, 8, 65, 10, 21, 3),
  Kardamom: n(311, 11, 68, 7, 28, 0),
  Vanille: n(288, 0.1, 13, 0.1, 0, 13),

  // -- Öle & Fette --
  Olivenöl: n(884, 0, 0, 100, 0, 0),
  Rapsöl: n(884, 0, 0, 100, 0, 0),
  Sonnenblumenöl: n(884, 0, 0, 100, 0, 0),
  Sesamöl: n(884, 0, 0, 100, 0, 0),
  Kokosöl: n(862, 0, 0, 100, 0, 0),

  // -- Saucen & Würzmittel --
  Sojasauce: n(53, 8, 5, 0.6, 0.8, 0.4),
  Essig: n(21, 0, 0, 0, 0, 0),
  Balsamico: n(88, 0.5, 17, 0, 0, 15),
  Tomatenmark: n(82, 4.3, 19, 0.5, 4.1, 12),
  Tomatensauce: n(35, 1.6, 7, 0.3, 1.5, 5),
  Senf: n(66, 4, 6, 4, 3, 3),
  Ketchup: n(101, 1.7, 27, 0.1, 0.3, 22),
  Mayonnaise: n(680, 1, 0.6, 75, 0, 0.6),
  Worcestersauce: n(78, 0, 20, 0, 0, 11),
  Gemüsebrühe: n(4, 0.5, 0.3, 0.1, 0, 0.1),
  Hühnerbrühe: n(12, 1.5, 0.9, 0.4, 0, 0.4),

  // -- Nüsse & Samen --
  Walnüsse: n(654, 15, 14, 65, 7, 2.6),
  Mandeln: n(575, 21, 22, 49, 12, 4),
  Cashewkerne: n(553, 18, 30, 44, 3.3, 5.9),
  Haselnüsse: n(628, 15, 17, 61, 10, 4),
  Pinienkerne: n(673, 14, 13, 68, 4, 4),
  Sesam: n(573, 18, 23, 50, 12, 0.3),
  Sonnenblumenkerne: n(584, 21, 20, 51, 9, 2.6),
  Kürbiskerne: n(559, 30, 11, 49, 6, 1.4),
  "Chia-Samen": n(486, 17, 42, 31, 34, 0),
  Leinsamen: n(534, 18, 29, 42, 27, 1.6),
};

// Schreibvarianten, die auf denselben Datensatz verweisen. Wenn der User
// "Amaranth" tippt (mit h), greifen wir auf "Amarant" zurück.
const NUTRITION_ALIASES: Record<string, string> = {
  Amaranth: "Amarant",
  "rote Bete": "Rote Bete",
  rotebete: "Rote Bete",
  Ananaa: "Ananas",
  Knoblauch: "Knoblauchzehe",
  Apfelmus: "Apfel",
  Eier: "Ei",
  Eiklar: "Eiweiß",
  Knobi: "Knoblauchzehe",
};

/**
 * Sucht passende Nährwerte für einen Zutat-Namen. Case-insensitive,
 * Trim-tolerant. Berücksichtigt Aliasse für gängige Schreibvarianten.
 *
 * Wichtig: hier wird KEIN Fuzzy-Matching gemacht — "Apfelsaft" ≠ "Apfel".
 * Sonst landen wir wieder bei falschen Werten.
 */
export function lookupFallbackNutriments(
  name: string,
): IngredientNutriments | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  // 1. Direkter Treffer
  if (NUTRITION_FALLBACK[trimmed]) return NUTRITION_FALLBACK[trimmed];

  // 2. Alias-Treffer
  const aliasTarget = NUTRITION_ALIASES[trimmed];
  if (aliasTarget && NUTRITION_FALLBACK[aliasTarget]) {
    return NUTRITION_FALLBACK[aliasTarget];
  }

  // 3. Case-insensitiv über alle Keys
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(NUTRITION_FALLBACK)) {
    if (key.toLowerCase() === lower) return NUTRITION_FALLBACK[key];
  }
  for (const aliasKey of Object.keys(NUTRITION_ALIASES)) {
    if (aliasKey.toLowerCase() === lower) {
      const target = NUTRITION_ALIASES[aliasKey];
      if (NUTRITION_FALLBACK[target]) return NUTRITION_FALLBACK[target];
    }
  }

  return null;
}
