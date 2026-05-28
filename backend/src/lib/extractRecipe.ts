// Helper-Logik für die KI-gestützte Rezept-Extraktion.
// Drei Eingangsformen — Text (für URL/PDF), Bild (für Foto/Kamera).
// Gibt immer ein einheitliches ExtractedRecipe zurück.
//
// Wir nutzen Google Gemini (Free Tier) — gemini-2.0-flash hat Vision-Support
// und liefert JSON-formatiertes Output zuverlässig.

import type { ExtractedRecipe } from "../types.js";

import { getGemini, MODEL } from "./gemini.js";

// Erlaubte Werte für `kind` — wird per Aufruf von außen reingegeben, NICHT von
// der KI bestimmt (der User wählt vorab Speise vs Getränk).
export type RecipeKind = "food" | "drink";

// MealType-Vokabular je nach kind. Spiegelbild von app/src/data/mealTypes.ts
// und drinkTypes.ts — bewusst dupliziert (Backend hat keinen Zugriff darauf).
const FOOD_MEAL_TYPES =
  "breakfast, lunch, dinner, snack, dessert, soup, salad, appetizer, sidedish, pastry, cake, bread, sauce, spread";
const DRINK_MEAL_TYPES =
  "cocktail, mocktail, shake, beer, wine, sparkling-wine, spirit, liqueur, lemonade, juice, schorle, tea, coffee, hot-drink, water, iced-tea, energy-drink, syrup, punch, mulled-wine";

// Baut die Systemanweisung — der mealType-Block und die kind-spezifischen
// Hinweise werden je nach Speise/Getränk eingesetzt, damit die KI gar nicht
// erst in Versuchung kommt, food-Werte für ein Getränk-Rezept zu liefern.
function buildSystemPrompt(kind: RecipeKind): string {
  const mealVocab = kind === "drink" ? DRINK_MEAL_TYPES : FOOD_MEAL_TYPES;
  const mealKindLabel =
    kind === "drink" ? "Getränk (Drink-Typ)" : "Speise (Mahlzeit-Typ)";
  const drinkHint =
    kind === "drink"
      ? "Bei Tags: Mahlzeit-Tags wie 'brunch' oder 'frühstück' weglassen, dafür sind alkoholisch/alkoholfrei besonders wichtig."
      : "Tags der Kategorie Alkohol (alkoholisch/alkoholfrei) NICHT setzen — die sind nur für Getränke gedacht.";

  return `Du bist ein hilfreicher Assistent, der Rezepte aus Texten, Webseiten oder Bildern extrahiert.

Gib das Ergebnis AUSSCHLIESSLICH als JSON-Objekt zurück (kein Markdown). Schema:

{
  "title": "string (kurzer Titel)",
  "shortDescription": "string (EXAKT 1 Zeile, max ~100 Zeichen, Pflicht wenn description vorhanden)",
  "description": "string (mehrere Sätze möglich, ausführlich, optional)",
  "instructions": "string (alle Schritte, mit \\n getrennt, durchnummeriert)",
  "prepTimeMinutes": number (optional),
  "cookTimeMinutes": number (optional),
  "servings": number (optional),
  "cuisine": "string (passender Länder-Code wie german, italian, french, spanish, greek, turkish, chinese, japanese, indian, mexican, american — Feld WEGLASSEN, wenn unsicher; NIEMALS 'other' setzen)",
  "mealType": "string (kommagetrennt, siehe Regeln — diese Eingabe ist eine ${mealKindLabel})",
  "tags": ["string", ...] (Tag-Namen aus der unten genannten Liste, nur passende),
  "ingredients": [
    { "name": "string", "quantity": number (optional), "unit": "string (g, ml, TL, EL, Stück, Prise...) optional", "notes": "string optional" }
  ],
  "confidence": number (0..1, wie sicher du dir bei der Erkennung bist)
}

Regeln:
- ALLE Texte (title, description, shortDescription, instructions, ingredient names, notes) auf DEUTSCH.
- shortDescription: knackiger Einzeiler, der das Rezept in 1 Zeile beschreibt.
  Wenn die Quelle bereits eine Kurzbeschreibung/Einleitung hat, übernimm sie
  (gekürzt auf max ~100 Zeichen). Sonst leite sie aus description / dem
  Gesamteindruck ab. NIE leer lassen, wenn das Rezept inhaltlich erkennbar ist.
- description: optional, mehrere Sätze (Hintergrund, Tipps), darf länger sein.
- Wenn ein Wert nicht klar erkennbar ist, lasse das Feld weg (nicht raten).
- Zutaten: pro Eintrag eine Zutat; Mengen als Zahl, Einheit separat.
- "instructions" als zusammenhängender String, Schritte durch "\\n" getrennt und durchnummeriert.
- Bei Mehrdeutigkeit: lieber weniger zurückgeben als falsche Werte.

- WICHTIG: Diese Eingabe ist eine ${mealKindLabel}. NIEMALS food/drink ändern
  oder ein 'kind'-Feld zurückgeben — der User hat das bereits festgelegt.

- mealType (kommagetrennt, mehrere möglich): NUR Werte aus dieser Liste
  verwenden — passend zur Eingabe:
    ${mealVocab}

- tags: wähle NUR aus der unten genannten Liste, exakte Schreibweise (klein
  geschrieben, mit Bindestrichen wo angegeben). Mehrere möglich, auch über
  Kategorien hinweg. WICHTIG: nur Tags setzen, die echt zutreffen — niemals
  raten. Allergen-Tags sind POSITIVE Markierungen "enthält-X": nur setzen,
  wenn die Zutat ECHT im Rezept vorkommt (z.B. "enthält-gluten", wenn
  Weizen/Roggen/Dinkel/Hafer drin ist; "enthält-laktose" bei Milch/Butter/
  Käse/Joghurt; "enthält-eier" bei Eiern; usw.). NICHT setzen, wenn das
  Allergen nicht im Rezept ist — fehlendes Tag bedeutet "frei davon".
  Bei Getränken: Mahlzeit-Tags weglassen; dafür sind alkoholisch/alkoholfrei
  wichtig.

  Verfügbare Tags pro Kategorie:
  • Ernährungsform: vegan, vegetarisch, pescetarisch, flexitarisch, paleo,
    low-carb, keto, low-fat, zuckerfrei, proteinreich, ballaststoffreich,
    rohkost, vollwertkost, mediterran, clean-eating
  • Gesundheit: diabetes-geeignet, arthrose-geeignet, herzgesund,
    nierengesund, darmgesund, entzündungshemmend, antioxidativ,
    immunstärkend, blutdrucksenkend, cholesterinsenkend,
    schwangerschaftsgeeignet, sportler-geeignet
  • Allergene — POSITIVE Markierung "enthält-X". Prüfe ALLE Zutaten gegen
    die Indikatoren unten. Setze das jeweilige Tag, wenn auch nur EINE
    passende Zutat im Rezept vorkommt — auch versteckt (Sojasauce enthält
    fast immer Weizen, Worcestersauce enthält Fisch, Gemüsebrühe enthält
    oft Sellerie, Mayonnaise enthält Eier). Im Zweifel lieber das Tag
    SETZEN als weglassen. Tag-Liste:
    enthält-gluten, enthält-laktose, enthält-nüsse, enthält-erdnüsse,
    enthält-eier, enthält-fisch, enthält-krustentiere, enthält-weichtiere,
    enthält-soja, enthält-sellerie, enthält-senf, enthält-sesam,
    enthält-sulfite, enthält-lupinen, enthält-histamin, enthält-fructose
  • Geschmack: süß, salzig, sauer, bitter, umami, scharf, mild, würzig,
    nussig, fruchtig, erfrischend, herzhaft, cremig, knusprig, rauchig,
    karamellig, buttrig, pikant
  • Alkohol: alkoholisch, alkoholfrei
  • Anlass: schnell, meal-prep, gäste-tauglich, familienessen,
    romantisches-dinner, sonntagsbraten, picknick, grillen, weihnachten,
    ostern, geburtstag, silvester, karneval, brunch, buffet, sommer,
    winter, herbst, frühling, sport-snack, resteverwertung, one-pot, backen

  ${drinkHint}

- Allergen-Check (Pflicht-Prüfung — gehe Zutat für Zutat durch und setze
  das jeweilige Tag, wenn auch nur EINE passende Zutat vorkommt):

  enthält-gluten ← Weizen, Roggen, Gerste, Hafer, Dinkel, Kamut, Mehl
    (außer ausdrücklich "glutenfrei"), Vollkornmehl, Brot, Brötchen, Toast,
    Baguette, Croutons, Nudeln, Pasta, Spaghetti, Lasagne, Penne, Couscous,
    Bulgur, Grieß, Paniermehl, Bier, Malzbier, Sojasauce (i.d.R. mit Weizen),
    Backteig, Hefeteig, Mürbeteig, Pizzateig, Croissants, Kuchen, Plätzchen
  enthält-laktose ← Milch, Vollmilch, Buttermilch, Sahne, Schlagsahne, Butter,
    Margarine (manche), Käse JEDER Sorte (Mozzarella, Parmesan, Gouda, Feta,
    Camembert, Frischkäse, Mascarpone, …), Joghurt, Quark, Schmand,
    Crème fraîche, Eis, Milchschokolade, Pudding, Bechamelsauce
  enthält-eier ← Ei, Eier, Eigelb, Eiweiß, Mayonnaise, Hollandaise,
    Aioli (klassisch), Spätzle (oft), Eierteigwaren, Baiser, Meringue,
    viele Backwaren (Kuchen, Plätzchen, Pfannkuchen)
  enthält-nüsse ← Walnüsse, Haselnüsse, Mandeln, Pistazien, Cashewkerne,
    Paranüsse, Macadamia, Pekannüsse, Marzipan, Nougat, Nuss-Nougat (Nutella)
  enthält-erdnüsse ← Erdnüsse, Erdnussbutter, Erdnussöl, Erdnussflips
    (Erdnüsse sind botanisch Hülsenfrüchte → separates Tag, NICHT
    "enthält-nüsse")
  enthält-fisch ← Lachs, Thunfisch, Forelle, Kabeljau, Hering, Makrele,
    Sardinen, Anchovis, Sardellen, Aal, Fischsauce, Worcestersauce
    (enthält Anchovis), Caesar-Dressing (oft mit Anchovis)
  enthält-krustentiere ← Garnelen, Shrimps, Krabben, Hummer, Krebse, Scampi,
    Langustinen, Langusten
  enthält-weichtiere ← Muscheln, Miesmuscheln, Austern, Tintenfisch, Calamari,
    Pulpo, Oktopus, Jakobsmuscheln, Schnecken
  enthält-soja ← Sojabohnen, Edamame, Sojamilch, Tofu, Tempeh, Sojasauce,
    Sojaöl, Miso, Miso-Paste, Sojagranulat, Sojadrink
  enthält-sellerie ← Knollensellerie, Stangensellerie, Selleriesalz,
    Gemüsebrühe (i.d.R. mit Sellerie), Bouillon, Suppengrün, Bratenfond,
    viele Würz- und Gewürzmischungen
  enthält-senf ← Senf (jede Art: Dijon-, scharfer, süßer), Senfkörner,
    Senfsauce, Sauce Béarnaise, viele Vinaigrettes/Dressings, Currypaste
    (oft), Honig-Senf-Marinade
  enthält-sesam ← Sesamsamen, Sesamöl, Tahini, Hummus (meist), Halva,
    Sesamringe/-brötchen, Falafel (oft)
  enthält-sulfite ← Wein (jeder), Sekt, Champagner, Bier (oft), Apfelwein,
    Trockenobst (oft, z.B. Rosinen, Aprikosen), Sauerkraut aus Konserven,
    Kartoffelpüree-Pulver
  enthält-lupinen ← Lupinenmehl, Lupinenschrot, Lupinenkaffee (selten —
    meist in veganen Burgern/Backwaren als Ei-Ersatz)
  enthält-histamin ← Reifkäse (Parmesan, Gorgonzola, Camembert, Roquefort,
    Brie), Rotwein, fermentierte Lebensmittel (Sauerkraut, Kimchi, Miso),
    Salami, Räucherfisch, Räucherwurst, Spinat, reife Tomaten, Avocado,
    dunkle Schokolade
  enthält-fructose ← Obst allgemein (besonders Apfel, Birne, Mango,
    Wassermelone, Trauben, Trockenobst, Apfelsaft), Honig, Agavendicksaft,
    Fruchtsirup, Fruchtsaft, Smoothies, Fruchtzubereitungen`;
}

// Erkennt transiente Fehler, die mit Warten + Retry behebbar sind.
// "Overloaded", "high demand", HTTP 503, oder Rate-Limit (429) sind typisch.
function isTransient(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("overload") ||
    msg.includes("high demand") ||
    msg.includes("temporar") ||
    msg.includes("unavailable") ||
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("retry")
  );
}

// Wartet `ms` Millisekunden — als Promise, damit `await` darauf geht.
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Führt `fn` aus und retried bei transienten Fehlern bis zu `maxAttempts` Mal,
// mit exponentiell wachsender Wartezeit (1s, 2s, 4s).
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === maxAttempts) throw err;
      const waitMs = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
      console.warn(
        `[Gemini] Transienter Fehler (Versuch ${attempt}/${maxAttempts}), warte ${waitMs}ms:`,
        err instanceof Error ? err.message : err,
      );
      await sleep(waitMs);
    }
  }
  throw lastErr;
}

function parseAndValidate(raw: string | undefined): ExtractedRecipe {
  if (!raw) throw new Error("Leere AI-Antwort");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI-Antwort war kein gültiges JSON: " + raw.slice(0, 200));
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI-Antwort hatte falsches Format");
  }
  return parsed as ExtractedRecipe;
}

/**
 * Extrahiert ein Rezept aus reinem Text — für URL- und PDF-Eingaben.
 * `kind` legt fest, welche mealType-Vokabular-Liste die KI nutzen darf.
 */
export async function extractFromText(
  text: string,
  kind: RecipeKind,
): Promise<ExtractedRecipe> {
  const ai = getGemini();
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Hier ist der Text, aus dem du das Rezept extrahieren sollst:\n\n${text.slice(0, 50000)}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: buildSystemPrompt(kind),
        // Wichtig: Gemini soll uns JSON liefern, nicht Fließtext mit Code-Block.
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  );

  return parseAndValidate(response.text);
}

/**
 * Extrahiert ein Rezept aus einem Bild.
 * imageBase64 enthält die Bilddaten OHNE "data:..."-Prefix.
 * `kind` legt fest, welche mealType-Vokabular-Liste die KI nutzen darf.
 */
export async function extractFromImage(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
  kind: RecipeKind = "food",
): Promise<ExtractedRecipe> {
  const ai = getGemini();
  const response = await withRetry(() =>
    ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Extrahiere das Rezept aus diesem Bild. Es kann ein Foto eines Kochbuchs, eines handgeschriebenen Rezepts oder einer Verpackung sein.",
            },
            {
              // Gemini akzeptiert "inlineData" für eingebettete Bilder.
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        systemInstruction: buildSystemPrompt(kind),
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  );

  return parseAndValidate(response.text);
}

/**
 * Lädt eine URL und gibt den sichtbaren Text + ein Vorschau-Bild zurück
 * (aus Open-Graph-/Twitter-Meta-Tags). Die KI sieht in der reinen Text-Form
 * keine Bilder — `og:image` ist der Standard, mit dem fast alle Rezept-
 * Seiten ihr Gericht-Foto markieren (für Social-Media-Preview).
 */
export async function fetchUrlAsText(
  url: string,
): Promise<{ text: string; imageUri?: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; FoodTempelBot/0.1; +https://food-tempel.app)",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} beim Abrufen von ${url}`);
  }
  const html = await response.text();
  return {
    text: stripHtmlToText(html),
    imageUri: extractPreviewImage(html, url),
  };
}

// Sucht im HTML nach einem Vorschau-Bild — bevorzugt og:image, sonst
// twitter:image. Beides sind De-facto-Standards in Rezept-Webseiten.
function extractPreviewImage(html: string, baseUrl: string): string | undefined {
  // Wir akzeptieren beide Attribut-Reihenfolgen (content vor property usw.).
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return absolutize(m[1], baseUrl);
  }
  return undefined;
}

// Relative URLs (selten, aber möglich) zu absoluten machen, damit das Bild
// auch in der App ladbar ist.
function absolutize(src: string, baseUrl: string): string {
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return src;
  }
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extrahiert Text aus PDF via unpdf.
 */
export async function extractTextFromPdf(pdfBuffer: Uint8Array): Promise<string> {
  const { extractText } = await import("unpdf");
  const { text } = await extractText(pdfBuffer, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}
