// Küchen-Einheiten für den UnitPicker + Heuristik für die Default-Einheit
// pro Zutat. Alle hier gelisteten `value`s MÜSSEN auch in
// `app/src/lib/unitsToGrams.ts` einen Gramm-Wert haben — sonst wählt der
// User eine Einheit aus, und die App meldet "nicht berechnet". Beim
// Erweitern bitte beide Dateien zusammen anfassen.

export type UnitGroup = {
  label: string;
  // Reihenfolge in `values` = Anzeigereihenfolge im Picker.
  values: string[];
};

// Gruppierte Liste — häufiges oben, exotisches unten. Großschreibung wie
// die User es tippen würden (`EL`, `Stück`); `convertToGrams` macht
// ohnehin `toLowerCase`, also reine Display-Sache.
export const KITCHEN_UNIT_GROUPS: UnitGroup[] = [
  {
    label: "Gewicht",
    values: ["g", "kg", "mg"],
  },
  {
    label: "Volumen",
    values: ["ml", "l", "cl"],
  },
  {
    label: "Löffel & Kleinstmengen",
    values: ["EL", "TL", "Prise", "Messerspitze", "Tropfen"],
  },
  {
    label: "Tassen & Schüsse",
    values: ["Tasse", "Becher", "Kelle", "Schuss", "Spritzer", "Handvoll"],
  },
  {
    label: "Stücke",
    values: [
      "Stück",
      "Hälfte",
      "Viertel",
      "Scheibe",
      "Spalte",
      "Ring",
      "Streifen",
      "Zehe",
      "Blatt",
      "Zweig",
      "Stiel",
      "Rispe",
      "Stange",
      "Bund",
      "Kopf",
      "Knolle",
      "Kugel",
      "Schale",
    ],
  },
  {
    label: "Fleisch & Fisch",
    values: ["Filet", "Brust", "Keule", "Schenkel", "Portion"],
  },
  {
    label: "Verpackung",
    values: [
      "Dose",
      "Glas",
      "Flasche",
      "Tüte",
      "Beutel",
      "Packung",
      "Päckchen",
      "Würfel",
      "Riegel",
      "Tafel",
      "Stick",
    ],
  },
];

// Flache Liste für Schnellzugriffe / Suche.
export const KITCHEN_UNITS: string[] = KITCHEN_UNIT_GROUPS.flatMap(
  (g) => g.values,
);

// ---------------------------------------------------------------------------
// Default-Einheit-Heuristik
//
// `getDefaultUnit(blsCode, name)` schlägt für eine Zutat die typische
// Einheit vor. Die App verwendet den Vorschlag NUR, wenn das Einheits-Feld
// noch leer ist — wir wollen nichts überschreiben, was der User schon
// eingestellt hat.
//
// Strategie (Reihenfolge wichtig — spezifisch vor allgemein):
//   1. Name-basierte Spezialfälle ("knoblauch" → Zehe, "vanillezucker" →
//      Päckchen). Treffsicher und sprachgenau.
//   2. BLS-Code-Präfix als Fallback ("M*" Milcherzeugnisse → ml). Greift
//      auch bei Lebensmitteln, die wir nicht namentlich kennen.
//   3. Default: "g". Wer Gramm tippt, liegt fast nie ganz falsch.
// ---------------------------------------------------------------------------

// Name-Heuristik. Wir matchen lowercase-substrings — Reihenfolge zählt,
// "ei roh" muss VOR "eis" kommen, sonst landet das gekochte Ei in der
// Eiskugel-Schublade.
type NameRule = { match: (n: string) => boolean; unit: string };

const NAME_RULES: NameRule[] = [
  // Frische Kräuter → Bund
  {
    match: (n) =>
      /\b(petersilie|schnittlauch|dill|kerbel|estragon|basilikum|koriander|minze|bärlauch)\b/.test(
        n,
      ),
    unit: "Bund",
  },
  // Zweig-Kräuter (Holzstiel)
  {
    match: (n) => /\b(rosmarin|thymian|salbei|oregano|majoran)\b/.test(n),
    unit: "Zweig",
  },
  // Lorbeerblatt-artiges
  { match: (n) => /\blorbeer/.test(n), unit: "Blatt" },
  // Würzkleinstmengen
  {
    match: (n) =>
      /\b(salz|pfeffer|muskat|muskatnuss|safran|kardamom|nelken|zimt|paprikapulver|currypulver|chiliflocken|chilipulver)\b/.test(
        n,
      ),
    unit: "Prise",
  },
  // Backzutaten in Tütchen
  {
    match: (n) =>
      /\b(vanillezucker|vanillinzucker|backpulver|natron|trockenhefe|puddingpulver|gelatine)\b/.test(
        n,
      ),
    unit: "Päckchen",
  },
  // Frischhefe
  { match: (n) => /\bfrischhefe\b/.test(n), unit: "Würfel" },
  // Knoblauch
  { match: (n) => /\bknoblauch/.test(n), unit: "Zehe" },
  // Eier (vor "Eis"!)
  { match: (n) => /\b(ei|hühnerei|wachtelei)\b/.test(n), unit: "Stück" },
  // Schokolade
  { match: (n) => /\bschokolade\b/.test(n), unit: "Tafel" },
  // Stangen-Gemüse
  {
    match: (n) => /\b(lauch|porree|staudensellerie|rhabarber)\b/.test(n),
    unit: "Stange",
  },
  // Aromatropfen
  {
    match: (n) => /\b(bittermandelöl|aroma|lebensmittelfarbe)\b/.test(n),
    unit: "Tropfen",
  },
  // Fleischstücke
  {
    match: (n) => /\b(hähnchenbrust|hühnerbrust|putenbrust)\b/.test(n),
    unit: "Brust",
  },
  {
    match: (n) => /\b(hähnchenkeule|hähnchenschenkel|hühnerkeule)\b/.test(n),
    unit: "Keule",
  },
  { match: (n) => /\bfilet\b/.test(n), unit: "Filet" },
  // Typisches Stück-Obst & -Gemüse (kommt auf der Theke einzeln)
  {
    match: (n) =>
      /\b(apfel|birne|orange|zitrone|limette|grapefruit|mandarine|kiwi|banane|pfirsich|nektarine|pflaume|aprikose|mango|avocado|papaya|granatapfel|tomate|paprika|kartoffel|zwiebel|möhre|karotte|gurke|aubergine|zucchini|kürbis)\b/.test(
        n,
      ),
    unit: "Stück",
  },
  // Salatköpfe
  {
    match: (n) =>
      /\b(kopfsalat|eisbergsalat|blumenkohl|brokkoli|rotkohl|weißkohl|wirsing|chinakohl)\b/.test(
        n,
      ),
    unit: "Kopf",
  },
  // Flüssigkeiten als Compound-Suffix (Apfelsaft, Gemüsebrühe, Sojamilch,
  // Mineralwasser, Apfelessig, Kalbsfond, Granatapfelsirup …). Kein \b am
  // Anfang, aber \b am Ende — sonst würde "Saftbar" oder "Brühepause"
  // greifen. Diese Begriffe sind im Deutschen praktisch immer Compound,
  // daher Suffix-Match.
  {
    match: (n) => /(saft|brühe|milch|wasser|sirup|essig|fond)\b/.test(n),
    unit: "ml",
  },
  // Standalone-Flüssigkeiten (kommen typischerweise als eigenes Wort vor;
  // "wein" mit \b davor, damit "Schwein" nicht matched).
  {
    match: (n) =>
      /\b(sahne|rahm|joghurt|kefir|buttermilch|wein|bier|rum|likör|sojasoße|sojasauce|sekt|prosecco)\b/.test(
        n,
      ),
    unit: "ml",
  },
  // Öle — meist Compound ("Olivenöl", "Rapsöl"), aber "öl" allein steht
  // auch. `öl\b` matched beides ohne Compound-Probleme (keine deutschen
  // Wörter enden auf "öl", die KEINE Öle sind).
  { match: (n) => /öl\b/.test(n), unit: "ml" },
];

// BLS-Code-Präfixe (erstes Zeichen des Codes = Lebensmittelgruppe).
// Quelle: BLS-4.0-Doku. Nur grob — viele Gruppen sind Mischmasch, daher
// gewinnt die Name-Heuristik oben fast immer.
const CODE_PREFIX_DEFAULTS: Record<string, string> = {
  B: "g", // Getreide
  C: "g", // Brot
  D: "g", // Backwaren
  E: "Stück", // Eier
  F: "Stück", // Obst (großteils Theken-Obst)
  G: "Stück", // Gemüse (großteils)
  H: "g", // Hülsenfrüchte/Kartoffeln (trocken/Pack)
  K: "g", // Kakao, Süßwaren, Zucker
  M: "ml", // Milch & Milcherzeugnisse (großteils Flüssig)
  P: "g", // Fleisch
  Q: "g", // Wurstwaren
  R: "g", // Fisch
  S: "ml", // Getränke
  W: "ml", // Würzmittel/Öle (gemischt)
};

export function getDefaultUnit(
  blsCode: string | null | undefined,
  name: string | null | undefined,
): string {
  const lowered = (name ?? "").toLowerCase();

  // 1. Name-Spezialfälle haben Vorrang.
  for (const rule of NAME_RULES) {
    if (rule.match(lowered)) return rule.unit;
  }

  // 2. BLS-Code-Präfix.
  if (blsCode && blsCode.length > 0) {
    const prefix = blsCode[0].toUpperCase();
    const fromPrefix = CODE_PREFIX_DEFAULTS[prefix];
    if (fromPrefix) return fromPrefix;
  }

  // 3. Universeller Fallback.
  return "g";
}
