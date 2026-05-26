// Kuratierte Liste der ~180 häufigsten deutschen Zutaten.
//
// Zweck: schneller Offline-Autocomplete im Rezept-Formular und Default-
// Vorschläge im Filter-Dropdown. Online ergänzt der Open-Food-Facts-Suggest-
// Endpoint diese Liste um zigtausend weitere Treffer.
//
// `defaultUnit` wird vorbelegt, wenn der User die Zutat aus dem Autocomplete
// wählt UND das Einheiten-Feld noch leer ist. Bewusst grob — kann der User
// jederzeit überschreiben.
//
// `category` ist nur für die UI (gruppierte Anzeige im leeren Suchzustand).

export type CommonIngredient = {
  name: string;
  defaultUnit?: string;
  category: string;
};

export const COMMON_INGREDIENTS: CommonIngredient[] = [
  // Obst
  { name: "Apfel", defaultUnit: "Stück", category: "Obst" },
  { name: "Birne", defaultUnit: "Stück", category: "Obst" },
  { name: "Banane", defaultUnit: "Stück", category: "Obst" },
  { name: "Orange", defaultUnit: "Stück", category: "Obst" },
  { name: "Mandarine", defaultUnit: "Stück", category: "Obst" },
  { name: "Zitrone", defaultUnit: "Stück", category: "Obst" },
  { name: "Limette", defaultUnit: "Stück", category: "Obst" },
  { name: "Grapefruit", defaultUnit: "Stück", category: "Obst" },
  { name: "Kiwi", defaultUnit: "Stück", category: "Obst" },
  { name: "Ananas", defaultUnit: "Stück", category: "Obst" },
  { name: "Mango", defaultUnit: "Stück", category: "Obst" },
  { name: "Pfirsich", defaultUnit: "Stück", category: "Obst" },
  { name: "Aprikose", defaultUnit: "Stück", category: "Obst" },
  { name: "Pflaume", defaultUnit: "Stück", category: "Obst" },
  { name: "Kirsche", defaultUnit: "g", category: "Obst" },
  { name: "Trauben", defaultUnit: "g", category: "Obst" },
  { name: "Erdbeere", defaultUnit: "g", category: "Obst" },
  { name: "Heidelbeere", defaultUnit: "g", category: "Obst" },
  { name: "Himbeere", defaultUnit: "g", category: "Obst" },
  { name: "Brombeere", defaultUnit: "g", category: "Obst" },
  { name: "Wassermelone", defaultUnit: "g", category: "Obst" },

  // Gemüse
  { name: "Tomate", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Cherrytomate", defaultUnit: "g", category: "Gemüse" },
  { name: "Zwiebel", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Knoblauchzehe", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Karotte", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Sellerie", defaultUnit: "g", category: "Gemüse" },
  { name: "Lauch", defaultUnit: "Stange", category: "Gemüse" },
  { name: "Frühlingszwiebel", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Paprika", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Gurke", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Zucchini", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Aubergine", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Kürbis", defaultUnit: "g", category: "Gemüse" },
  { name: "Kartoffel", defaultUnit: "g", category: "Gemüse" },
  { name: "Süßkartoffel", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Pastinake", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Rote Bete", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Brokkoli", defaultUnit: "g", category: "Gemüse" },
  { name: "Blumenkohl", defaultUnit: "Stück", category: "Gemüse" },
  { name: "Rosenkohl", defaultUnit: "g", category: "Gemüse" },
  { name: "Spinat", defaultUnit: "g", category: "Gemüse" },
  { name: "Mangold", defaultUnit: "g", category: "Gemüse" },
  { name: "Champignon", defaultUnit: "g", category: "Gemüse" },
  { name: "Steinpilz", defaultUnit: "g", category: "Gemüse" },
  { name: "Pfifferling", defaultUnit: "g", category: "Gemüse" },
  { name: "Mais", defaultUnit: "g", category: "Gemüse" },
  { name: "Erbsen", defaultUnit: "g", category: "Gemüse" },
  { name: "Grüne Bohnen", defaultUnit: "g", category: "Gemüse" },

  // Salat & Kräuter
  { name: "Kopfsalat", defaultUnit: "Stück", category: "Salat & Kräuter" },
  { name: "Eisbergsalat", defaultUnit: "Stück", category: "Salat & Kräuter" },
  { name: "Feldsalat", defaultUnit: "g", category: "Salat & Kräuter" },
  { name: "Rucola", defaultUnit: "g", category: "Salat & Kräuter" },
  { name: "Petersilie", defaultUnit: "Bund", category: "Salat & Kräuter" },
  { name: "Basilikum", defaultUnit: "Bund", category: "Salat & Kräuter" },
  { name: "Schnittlauch", defaultUnit: "Bund", category: "Salat & Kräuter" },
  { name: "Dill", defaultUnit: "Bund", category: "Salat & Kräuter" },
  { name: "Thymian", defaultUnit: "Zweig", category: "Salat & Kräuter" },
  { name: "Rosmarin", defaultUnit: "Zweig", category: "Salat & Kräuter" },
  { name: "Salbei", defaultUnit: "Blatt", category: "Salat & Kräuter" },
  { name: "Oregano", defaultUnit: "TL", category: "Salat & Kräuter" },
  { name: "Minze", defaultUnit: "Bund", category: "Salat & Kräuter" },
  { name: "Koriander", defaultUnit: "Bund", category: "Salat & Kräuter" },

  // Fleisch & Geflügel
  { name: "Hähnchenbrust", defaultUnit: "g", category: "Fleisch & Geflügel" },
  { name: "Hähnchenschenkel", defaultUnit: "Stück", category: "Fleisch & Geflügel" },
  { name: "Putenbrust", defaultUnit: "g", category: "Fleisch & Geflügel" },
  { name: "Hackfleisch gemischt", defaultUnit: "g", category: "Fleisch & Geflügel" },
  { name: "Rinderhack", defaultUnit: "g", category: "Fleisch & Geflügel" },
  { name: "Schweinehack", defaultUnit: "g", category: "Fleisch & Geflügel" },
  { name: "Rindersteak", defaultUnit: "g", category: "Fleisch & Geflügel" },
  { name: "Schweinefilet", defaultUnit: "g", category: "Fleisch & Geflügel" },
  { name: "Schweinebauch", defaultUnit: "g", category: "Fleisch & Geflügel" },
  { name: "Speck", defaultUnit: "g", category: "Fleisch & Geflügel" },
  { name: "Schinken", defaultUnit: "g", category: "Fleisch & Geflügel" },
  { name: "Salami", defaultUnit: "g", category: "Fleisch & Geflügel" },
  { name: "Wurst", defaultUnit: "Stück", category: "Fleisch & Geflügel" },

  // Fisch & Meeresfrüchte
  { name: "Lachs", defaultUnit: "g", category: "Fisch & Meeresfrüchte" },
  { name: "Thunfisch", defaultUnit: "Dose", category: "Fisch & Meeresfrüchte" },
  { name: "Forelle", defaultUnit: "Stück", category: "Fisch & Meeresfrüchte" },
  { name: "Kabeljau", defaultUnit: "g", category: "Fisch & Meeresfrüchte" },
  { name: "Hering", defaultUnit: "g", category: "Fisch & Meeresfrüchte" },
  { name: "Garnele", defaultUnit: "g", category: "Fisch & Meeresfrüchte" },
  { name: "Tintenfisch", defaultUnit: "g", category: "Fisch & Meeresfrüchte" },
  { name: "Muscheln", defaultUnit: "g", category: "Fisch & Meeresfrüchte" },

  // Milchprodukte & Eier
  { name: "Milch", defaultUnit: "ml", category: "Milchprodukte & Eier" },
  { name: "Sahne", defaultUnit: "ml", category: "Milchprodukte & Eier" },
  { name: "Schmand", defaultUnit: "g", category: "Milchprodukte & Eier" },
  { name: "Crème fraîche", defaultUnit: "g", category: "Milchprodukte & Eier" },
  { name: "Saure Sahne", defaultUnit: "g", category: "Milchprodukte & Eier" },
  { name: "Joghurt", defaultUnit: "g", category: "Milchprodukte & Eier" },
  { name: "Quark", defaultUnit: "g", category: "Milchprodukte & Eier" },
  { name: "Buttermilch", defaultUnit: "ml", category: "Milchprodukte & Eier" },
  { name: "Butter", defaultUnit: "g", category: "Milchprodukte & Eier" },
  { name: "Margarine", defaultUnit: "g", category: "Milchprodukte & Eier" },
  { name: "Ei", defaultUnit: "Stück", category: "Milchprodukte & Eier" },
  { name: "Eigelb", defaultUnit: "Stück", category: "Milchprodukte & Eier" },
  { name: "Eiweiß", defaultUnit: "Stück", category: "Milchprodukte & Eier" },

  // Käse
  { name: "Mozzarella", defaultUnit: "g", category: "Käse" },
  { name: "Parmesan", defaultUnit: "g", category: "Käse" },
  { name: "Feta", defaultUnit: "g", category: "Käse" },
  { name: "Gouda", defaultUnit: "g", category: "Käse" },
  { name: "Cheddar", defaultUnit: "g", category: "Käse" },
  { name: "Frischkäse", defaultUnit: "g", category: "Käse" },
  { name: "Ricotta", defaultUnit: "g", category: "Käse" },
  { name: "Bergkäse", defaultUnit: "g", category: "Käse" },
  { name: "Gorgonzola", defaultUnit: "g", category: "Käse" },

  // Brot & Backwaren
  { name: "Toast", defaultUnit: "Scheibe", category: "Brot & Backwaren" },
  { name: "Brot", defaultUnit: "Scheibe", category: "Brot & Backwaren" },
  { name: "Brötchen", defaultUnit: "Stück", category: "Brot & Backwaren" },
  { name: "Baguette", defaultUnit: "Stück", category: "Brot & Backwaren" },
  { name: "Wrap", defaultUnit: "Stück", category: "Brot & Backwaren" },
  { name: "Tortilla", defaultUnit: "Stück", category: "Brot & Backwaren" },

  // Getreide & Hülsenfrüchte
  { name: "Haferflocken", defaultUnit: "g", category: "Getreide & Hülsenfrüchte" },
  { name: "Müsli", defaultUnit: "g", category: "Getreide & Hülsenfrüchte" },
  { name: "Cornflakes", defaultUnit: "g", category: "Getreide & Hülsenfrüchte" },
  { name: "Couscous", defaultUnit: "g", category: "Getreide & Hülsenfrüchte" },
  { name: "Bulgur", defaultUnit: "g", category: "Getreide & Hülsenfrüchte" },
  { name: "Quinoa", defaultUnit: "g", category: "Getreide & Hülsenfrüchte" },
  { name: "Linsen", defaultUnit: "g", category: "Getreide & Hülsenfrüchte" },
  { name: "Kichererbsen", defaultUnit: "g", category: "Getreide & Hülsenfrüchte" },
  { name: "Weiße Bohnen", defaultUnit: "g", category: "Getreide & Hülsenfrüchte" },
  { name: "Kidneybohnen", defaultUnit: "g", category: "Getreide & Hülsenfrüchte" },

  // Nudeln & Reis
  { name: "Spaghetti", defaultUnit: "g", category: "Nudeln & Reis" },
  { name: "Penne", defaultUnit: "g", category: "Nudeln & Reis" },
  { name: "Tagliatelle", defaultUnit: "g", category: "Nudeln & Reis" },
  { name: "Lasagneblätter", defaultUnit: "Blatt", category: "Nudeln & Reis" },
  { name: "Tortellini", defaultUnit: "g", category: "Nudeln & Reis" },
  { name: "Reis", defaultUnit: "g", category: "Nudeln & Reis" },
  { name: "Wildreis", defaultUnit: "g", category: "Nudeln & Reis" },
  { name: "Risottoreis", defaultUnit: "g", category: "Nudeln & Reis" },
  { name: "Asia-Nudeln", defaultUnit: "g", category: "Nudeln & Reis" },

  // Backzutaten
  { name: "Mehl", defaultUnit: "g", category: "Backzutaten" },
  { name: "Vollkornmehl", defaultUnit: "g", category: "Backzutaten" },
  { name: "Stärke", defaultUnit: "g", category: "Backzutaten" },
  { name: "Zucker", defaultUnit: "g", category: "Backzutaten" },
  { name: "Brauner Zucker", defaultUnit: "g", category: "Backzutaten" },
  { name: "Puderzucker", defaultUnit: "g", category: "Backzutaten" },
  { name: "Vanillezucker", defaultUnit: "Päckchen", category: "Backzutaten" },
  { name: "Backpulver", defaultUnit: "TL", category: "Backzutaten" },
  { name: "Natron", defaultUnit: "TL", category: "Backzutaten" },
  { name: "Hefe", defaultUnit: "Würfel", category: "Backzutaten" },
  { name: "Trockenhefe", defaultUnit: "Päckchen", category: "Backzutaten" },
  { name: "Honig", defaultUnit: "EL", category: "Backzutaten" },
  { name: "Ahornsirup", defaultUnit: "EL", category: "Backzutaten" },

  // Gewürze
  { name: "Salz", defaultUnit: "TL", category: "Gewürze" },
  { name: "Pfeffer", defaultUnit: "TL", category: "Gewürze" },
  { name: "Paprika edelsüß", defaultUnit: "TL", category: "Gewürze" },
  { name: "Paprika scharf", defaultUnit: "TL", category: "Gewürze" },
  { name: "Curry", defaultUnit: "TL", category: "Gewürze" },
  { name: "Kreuzkümmel", defaultUnit: "TL", category: "Gewürze" },
  { name: "Koriander gemahlen", defaultUnit: "TL", category: "Gewürze" },
  { name: "Muskat", defaultUnit: "Prise", category: "Gewürze" },
  { name: "Zimt", defaultUnit: "TL", category: "Gewürze" },
  { name: "Nelken", defaultUnit: "Stück", category: "Gewürze" },
  { name: "Lorbeerblatt", defaultUnit: "Stück", category: "Gewürze" },
  { name: "Kümmel", defaultUnit: "TL", category: "Gewürze" },
  { name: "Chili", defaultUnit: "TL", category: "Gewürze" },
  { name: "Cayennepfeffer", defaultUnit: "TL", category: "Gewürze" },
  { name: "Knoblauchpulver", defaultUnit: "TL", category: "Gewürze" },
  { name: "Zwiebelpulver", defaultUnit: "TL", category: "Gewürze" },
  { name: "Ingwer", defaultUnit: "g", category: "Gewürze" },
  { name: "Kurkuma", defaultUnit: "TL", category: "Gewürze" },
  { name: "Kardamom", defaultUnit: "TL", category: "Gewürze" },
  { name: "Vanille", defaultUnit: "TL", category: "Gewürze" },

  // Öle & Fette
  { name: "Olivenöl", defaultUnit: "EL", category: "Öle & Fette" },
  { name: "Rapsöl", defaultUnit: "EL", category: "Öle & Fette" },
  { name: "Sonnenblumenöl", defaultUnit: "EL", category: "Öle & Fette" },
  { name: "Sesamöl", defaultUnit: "EL", category: "Öle & Fette" },
  { name: "Kokosöl", defaultUnit: "EL", category: "Öle & Fette" },

  // Saucen & Würzmittel
  { name: "Sojasauce", defaultUnit: "EL", category: "Saucen & Würzmittel" },
  { name: "Essig", defaultUnit: "EL", category: "Saucen & Würzmittel" },
  { name: "Balsamico", defaultUnit: "EL", category: "Saucen & Würzmittel" },
  { name: "Tomatenmark", defaultUnit: "EL", category: "Saucen & Würzmittel" },
  { name: "Tomatensauce", defaultUnit: "g", category: "Saucen & Würzmittel" },
  { name: "Senf", defaultUnit: "EL", category: "Saucen & Würzmittel" },
  { name: "Ketchup", defaultUnit: "EL", category: "Saucen & Würzmittel" },
  { name: "Mayonnaise", defaultUnit: "EL", category: "Saucen & Würzmittel" },
  { name: "Worcestersauce", defaultUnit: "TL", category: "Saucen & Würzmittel" },
  { name: "Gemüsebrühe", defaultUnit: "ml", category: "Saucen & Würzmittel" },
  { name: "Hühnerbrühe", defaultUnit: "ml", category: "Saucen & Würzmittel" },

  // Nüsse & Samen
  { name: "Walnüsse", defaultUnit: "g", category: "Nüsse & Samen" },
  { name: "Mandeln", defaultUnit: "g", category: "Nüsse & Samen" },
  { name: "Cashewkerne", defaultUnit: "g", category: "Nüsse & Samen" },
  { name: "Haselnüsse", defaultUnit: "g", category: "Nüsse & Samen" },
  { name: "Pinienkerne", defaultUnit: "g", category: "Nüsse & Samen" },
  { name: "Sesam", defaultUnit: "g", category: "Nüsse & Samen" },
  { name: "Sonnenblumenkerne", defaultUnit: "g", category: "Nüsse & Samen" },
  { name: "Kürbiskerne", defaultUnit: "g", category: "Nüsse & Samen" },
  { name: "Chia-Samen", defaultUnit: "g", category: "Nüsse & Samen" },
  { name: "Leinsamen", defaultUnit: "g", category: "Nüsse & Samen" },
];

// Schneller Lookup: alle Namen als Set für O(1) Existenzprüfung.
export const COMMON_INGREDIENT_NAMES = new Set(
  COMMON_INGREDIENTS.map((i) => i.name),
);

// Map name → defaultUnit, für die "Einheit vorbelegen wenn leer"-Logik.
export const DEFAULT_UNIT_BY_NAME: Record<string, string | undefined> =
  Object.fromEntries(
    COMMON_INGREDIENTS.map((i) => [i.name, i.defaultUnit]),
  );
