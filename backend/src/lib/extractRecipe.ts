// Helper-Logik für die KI-gestützte Rezept-Extraktion.
// Drei Eingangsformen — Text (für URL/PDF), Bild (für Foto/Kamera).
// Gibt immer ein einheitliches ExtractedRecipe zurück.
//
// Wir nutzen Google Gemini (Free Tier) — gemini-2.0-flash hat Vision-Support
// und liefert JSON-formatiertes Output zuverlässig.

import type { ExtractedRecipe } from "../types.js";

import { getGemini, MODEL } from "./gemini.js";

// Systemanweisung — kommt bei Gemini in `config.systemInstruction`.
const SYSTEM_PROMPT = `Du bist ein hilfreicher Assistent, der Rezepte aus Texten, Webseiten oder Bildern extrahiert.

Gib das Ergebnis AUSSCHLIESSLICH als JSON-Objekt zurück (kein Markdown). Schema:

{
  "title": "string (kurzer Titel)",
  "description": "string (1-2 Sätze, optional)",
  "instructions": "string (alle Schritte, mit \\n getrennt, durchnummeriert)",
  "prepTimeMinutes": number (optional),
  "cookTimeMinutes": number (optional),
  "servings": number (optional),
  "cuisine": "string (einer von: german, italian, french, spanish, greek, turkish, chinese, japanese, indian, mexican, american, other)",
  "mealType": "string (einer von: breakfast, lunch, dinner, snack, dessert)",
  "ingredients": [
    { "name": "string", "quantity": number (optional), "unit": "string (g, ml, TL, EL, Stück, Prise...) optional", "notes": "string optional" }
  ],
  "confidence": number (0..1, wie sicher du dir bei der Erkennung bist)
}

Regeln:
- ALLE Texte (title, description, instructions, ingredient names, notes) auf DEUTSCH.
- Wenn ein Wert nicht klar erkennbar ist, lasse das Feld weg (nicht raten).
- Zutaten: pro Eintrag eine Zutat; Mengen als Zahl, Einheit separat.
- "instructions" als zusammenhängender String, Schritte durch "\\n" getrennt und durchnummeriert.
- Bei Mehrdeutigkeit: lieber weniger zurückgeben als falsche Werte.`;

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
 */
export async function extractFromText(text: string): Promise<ExtractedRecipe> {
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
        systemInstruction: SYSTEM_PROMPT,
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
 */
export async function extractFromImage(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
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
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  );

  return parseAndValidate(response.text);
}

/**
 * Lädt eine URL und gibt den sichtbaren Text zurück (HTML ohne Tags).
 */
export async function fetchUrlAsText(url: string): Promise<string> {
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
  return stripHtmlToText(html);
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
