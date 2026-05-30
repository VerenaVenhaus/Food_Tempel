// Einmaliger Sanity-Check für `app/src/data/units.ts::getDefaultUnit`.
// Wir können die TS-Datei nicht direkt importieren, also bauen wir die
// Heuristik hier 1:1 nach und prüfen ein paar Beispiele aus dem Alltag.
// Wenn dieser Test schief geht, ist die echte Heuristik wahrscheinlich
// auch falsch — dann beide Dateien synchron anpassen.

const NAME_RULES = [
  { match: (n) => /\b(petersilie|schnittlauch|dill|kerbel|estragon|basilikum|koriander|minze|bärlauch)\b/.test(n), unit: "Bund" },
  { match: (n) => /\b(rosmarin|thymian|salbei|oregano|majoran)\b/.test(n), unit: "Zweig" },
  { match: (n) => /\blorbeer/.test(n), unit: "Blatt" },
  { match: (n) => /\b(salz|pfeffer|muskat|muskatnuss|safran|kardamom|nelken|zimt|paprikapulver|currypulver|chiliflocken|chilipulver)\b/.test(n), unit: "Prise" },
  { match: (n) => /\b(vanillezucker|vanillinzucker|backpulver|natron|trockenhefe|puddingpulver|gelatine)\b/.test(n), unit: "Päckchen" },
  { match: (n) => /\bfrischhefe\b/.test(n), unit: "Würfel" },
  { match: (n) => /\bknoblauch/.test(n), unit: "Zehe" },
  { match: (n) => /\b(ei|hühnerei|wachtelei)\b/.test(n), unit: "Stück" },
  { match: (n) => /\bschokolade\b/.test(n), unit: "Tafel" },
  { match: (n) => /\b(lauch|porree|staudensellerie|rhabarber)\b/.test(n), unit: "Stange" },
  { match: (n) => /\b(bittermandelöl|aroma|lebensmittelfarbe)\b/.test(n), unit: "Tropfen" },
  { match: (n) => /\b(hähnchenbrust|hühnerbrust|putenbrust)\b/.test(n), unit: "Brust" },
  { match: (n) => /\b(hähnchenkeule|hähnchenschenkel|hühnerkeule)\b/.test(n), unit: "Keule" },
  { match: (n) => /\bfilet\b/.test(n), unit: "Filet" },
  { match: (n) => /\b(apfel|birne|orange|zitrone|limette|grapefruit|mandarine|kiwi|banane|pfirsich|nektarine|pflaume|aprikose|mango|avocado|papaya|granatapfel|tomate|paprika|kartoffel|zwiebel|möhre|karotte|gurke|aubergine|zucchini|kürbis)\b/.test(n), unit: "Stück" },
  { match: (n) => /\b(kopfsalat|eisbergsalat|blumenkohl|brokkoli|rotkohl|weißkohl|wirsing|chinakohl)\b/.test(n), unit: "Kopf" },
  { match: (n) => /(saft|brühe|milch|wasser|sirup|essig|fond)\b/.test(n), unit: "ml" },
  { match: (n) => /\b(sahne|rahm|joghurt|kefir|buttermilch|wein|bier|rum|likör|sojasoße|sojasauce|sekt|prosecco)\b/.test(n), unit: "ml" },
  { match: (n) => /öl\b/.test(n), unit: "ml" },
];

const CODE_PREFIX_DEFAULTS = {
  B: "g", C: "g", D: "g", E: "Stück", F: "Stück", G: "Stück",
  H: "g", K: "g", M: "ml", P: "g", Q: "g", R: "g", S: "ml", W: "ml",
};

function getDefaultUnit(blsCode, name) {
  const lowered = (name ?? "").toLowerCase();
  for (const rule of NAME_RULES) if (rule.match(lowered)) return rule.unit;
  if (blsCode && blsCode.length > 0) {
    const fromPrefix = CODE_PREFIX_DEFAULTS[blsCode[0].toUpperCase()];
    if (fromPrefix) return fromPrefix;
  }
  return "g";
}

// Stichproben: jede Zeile = [BLS-Code (oder null), Name, erwartet]
const CASES = [
  ["F110100", "Apfel roh", "Stück"],
  ["M113300", "H-Vollmilch 3,5 %", "ml"],
  ["G480100", "Speisezwiebel roh", "Stück"],
  ["E111100", "Hühnerei roh", "Stück"],
  ["Q630000", "Butter", "g"],
  ["C214100", "Weizenmehl Type 405", "g"],
  ["M141300", "Joghurt natur", "ml"],
  [null, "Knoblauch", "Zehe"],
  [null, "Knoblauchzehe", "Zehe"],
  [null, "Petersilie glatt", "Bund"],
  [null, "Rosmarin frisch", "Zweig"],
  [null, "Lorbeerblatt", "Blatt"],
  [null, "Salz", "Prise"],
  [null, "Pfeffer schwarz", "Prise"],
  [null, "Vanillezucker", "Päckchen"],
  [null, "Frischhefe", "Würfel"],
  [null, "Schokolade Zartbitter", "Tafel"],
  [null, "Lauch", "Stange"],
  [null, "Hähnchenbrust", "Brust"],
  [null, "Bittermandelöl", "Tropfen"],
  [null, "Tomate", "Stück"],
  [null, "Brokkoli", "Kopf"],
  [null, "Sahne", "ml"],
  [null, "Olivenöl", "ml"],
  [null, "Wein, weiß", "ml"],
  // Tricky: Apfelsaft soll als Flüssigkeit erkannt werden (saft-Match
  // greift VOR apfel-Match wegen Reihenfolge im NAME_RULES-Array).
  [null, "Apfelsaft", "ml"],
  // Weitere Compound-Tests
  [null, "Tomatensaft", "ml"],
  [null, "Gemüsebrühe", "ml"],
  [null, "Sojamilch", "ml"],
  [null, "Mineralwasser", "ml"],
  [null, "Balsamico-Essig", "ml"],
  [null, "Kalbsfond", "ml"],
  // Falsch-Match-Test: "Schweinebraten" darf NICHT zu "ml" werden
  [null, "Schweinebraten", "g"],
  // Ganz freies Wort → Fallback "g"
  [null, "irgendwas Exotisches", "g"],
];

let ok = 0;
let fail = 0;
for (const [code, name, expected] of CASES) {
  const got = getDefaultUnit(code, name);
  const pass = got === expected;
  if (pass) ok++;
  else fail++;
  console.log(
    `${pass ? "✓" : "✗"} ${String(code).padEnd(8)} ${name.padEnd(28)} → ${got}${pass ? "" : `   (erwartet: ${expected})`}`,
  );
}
console.log(`\n${ok}/${ok + fail} bestanden.`);
process.exit(fail === 0 ? 0 : 1);
