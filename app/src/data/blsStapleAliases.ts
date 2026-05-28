// Kuratierte Schnellzugriff-Liste für Alltags-Grundzutaten.
//
// Problem: BLS benennt Grundzutaten sehr spezifisch — die rohe Zwiebel heißt
// "Speisezwiebel roh", Milch "H-Vollmilch 3,5 % Fett", Ei "Hühnerei roh".
// Wer "Zwiebel", "Milch" oder "Ei" tippt, fände diese sonst nicht ganz oben.
//
// Diese Map ist KEINE zweite Datenquelle (Nährwerte kommen weiter NUR aus dem
// BLS), sondern nur ein dünner Zeiger: Suchbegriff → exakter BLS-Code. Trifft
// die Suche einen dieser Begriffe, wird das zugeordnete Lebensmittel im
// Autocomplete nach oben geheftet.
//
// WICHTIG: Schlüssel müssen in normalisierter Form stehen (klein geschrieben,
// Umlaute gefaltet: ä→a, ö→o, ü→u, ß→ss) — genau wie normalizeBlsSearch()
// die Eingabe umwandelt. Sonst greift der Abgleich nicht.
//
// Codes wurden aus BLS_4_0_Daten_2025_DE verifiziert (scripts/convert-bls.mjs).

export const BLS_STAPLE_ALIASES: Record<string, string> = {
  // -- Obst --
  apfel: "F110100", // Apfel roh
  banane: "F503100", // Banane roh
  birne: "F130100", // Birne roh
  orange: "F603100", // Orange roh
  zitrone: "F601100", // Zitrone roh
  erdbeere: "F301100", // Erdbeere roh
  himbeere: "F302100", // Himbeere roh
  heidelbeere: "F304100", // Heidelbeere roh
  traube: "F310100", // Weintraube roh
  weintraube: "F310100",
  trauben: "F310100",
  mango: "F516100", // Mango roh
  ananas: "F501100", // Ananas roh
  kiwi: "F514100", // Kiwi roh
  pfirsich: "F203100", // Pfirsich roh
  wassermelone: "F535100", // Wassermelone roh
  avocado: "F502100", // Avocado roh

  // -- Gemüse --
  zwiebel: "G480100", // Speisezwiebel roh
  zwiebeln: "G480100",
  knoblauch: "G490100", // Knoblauch roh
  karotte: "G620100", // Karotte/Möhre, roh
  karotten: "G620100",
  mohre: "G620100", // "möhre" normalisiert
  mohren: "G620100",
  tomate: "G561100", // Tomate roh
  tomaten: "G561100",
  kartoffel: "K110100", // Kartoffel geschält, roh
  kartoffeln: "K110100",
  paprika: "G543100", // Gemüsepaprika rot, roh
  gurke: "G520100", // Gurke roh
  zucchini: "G582100", // Zucchini roh
  aubergine: "G510100", // Aubergine roh
  brokkoli: "G312100", // Broccoli roh
  broccoli: "G312100",
  blumenkohl: "G311100", // Blumenkohl roh
  spinat: "G211100", // Spinat roh
  champignon: "K701100", // Champignon roh
  champignons: "K701100",
  pilze: "K701100",
  lauch: "G470100", // Porree/Lauch, roh
  porree: "G470100",
  sellerie: "G660100", // Knollensellerie roh
  salat: "G105100", // Kopfsalat roh
  mais: "G570100", // Zuckermais roh
  erbse: "G760100", // Erbse grün, roh
  erbsen: "G760100",
  "rote bete": "G613100", // Rote Rübe/Rote Bete, roh
  bete: "G613100",
  kurbis: "G581000", // Kürbis Hokkaido roh

  // -- Milchprodukte & Käse --
  milch: "M113300", // H-Vollmilch 3,5 % Fett
  vollmilch: "M113300",
  butter: "Q630000", // Süßrahmbutter
  sahne: "M173800", // Schlagsahne mind. 30 % Fett
  schlagsahne: "M173800",
  joghurt: "M141300", // Joghurt mild, mind. 3,5 % Fett (Naturjoghurt)
  quark: "M713100", // Speisequark Magerstufe (Magerquark)
  magerquark: "M713100",
  frischkase: "M820200", // Frischkäsezubereitung Natur, mind. 10 % Fett
  gouda: "M402600", // Gouda 48 % Fett i. Tr.
  mozzarella: "M0A1000", // Mozzarella mind. 20 % Fett i. Tr.
  parmesan: "M306400", // Parmesan mind. 30 % Fett i. Tr.
  feta: "M012200", // Feta mind. 45 % Fett i. Tr.

  // -- Ei --
  ei: "E111100", // Hühnerei roh
  eier: "E111100",

  // -- Fleisch & Fisch --
  hahnchen: "V416100", // Hähnchen Brustfilet, roh
  hahnchenbrust: "V416100",
  rind: "U201000", // Rind Muskelfleisch, roh
  rindfleisch: "U201000",
  schwein: "U601000", // Schwein Muskelfleisch, roh
  schweinefleisch: "U601000",
  hackfleisch: "U050100", // Rind/Schwein, Hackfleisch gemischt, roh
  lachs: "T410100", // Lachs roh
  thunfisch: "T121100", // Thunfisch roh
  schinken: "W424000", // Schwein Kochschinken, Kochpökelware
  speck: "W411300", // Schwein Bauchspeck, Rohpökelware, geräuchert

  // -- Grundnahrungsmittel --
  mehl: "C214100", // Weizen Mehl, Type 405
  weizenmehl: "C214100",
  zucker: "S111000", // Zucker weiß (Raffinadezucker/Weißzucker)
  salz: "R114000", // Speisesalz jodiert/Jodsalz
  reis: "C352000", // Reis poliert, roh
  nudeln: "E401000", // Teigwaren eifrei, roh
  spaghetti: "E401000",
  teigwaren: "E401000",
  brot: "B311000", // Weizenbrot/Weißbrot
  olivenol: "Q120000", // Olivenöl ("olivenöl" normalisiert)
  essig: "R121000", // Weinessig
  pfeffer: "R258100", // Pfeffer schwarz, getrocknet
  petersilie: "G250100", // Petersilienblatt roh
  basilikum: "G061000", // Basilikum roh
};
