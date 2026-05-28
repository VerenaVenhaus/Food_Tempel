// Client zum Aufrufen unseres eigenen Backends.
//
// Das Backend braucht den Supabase-JWT, damit es weiß, welcher User
// gerade einen Call macht. Den ziehen wir aus dem Supabase-Client der App.
//
// Konfigurierbar über EXPO_PUBLIC_API_URL in der .env-Datei.
// Falls die Variable fehlt, nehmen wir localhost — funktioniert aber
// nur, wenn das Handy via USB/ADB-Bridge mit dem PC verbunden ist.
// Für den Android-Emulator ist die PC-Adresse "10.0.2.2" statt "localhost"
// (Emulator-spezifisch).

import { Platform } from "react-native";

import { computeBlsTotals, type NutritionInputIngredient } from "./blsNutrition";
import { supabase } from "./supabase";

function defaultApiUrl(): string {
  // Android-Emulator: 10.0.2.2 ist die "Host-Schleife" — vom Emulator aus
  // erreichst du damit deinen lokalen PC.
  if (Platform.OS === "android") return "http://10.0.2.2:3000";
  return "http://localhost:3000";
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl();

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const auth = await getAuthHeader();
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...auth,
        ...(init.headers ?? {}),
      },
    });

    const json = (await response.json()) as ApiResult<T>;
    return json;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// Public API ---------------------------------------------------------------

export async function pingBackend(): Promise<ApiResult<{ service: string; timestamp: string }>> {
  return request("/health");
}

export type ExtractedRecipe = {
  title?: string;
  description?: string;
  // 1-Zeilen-Vorschau, von der KI mitgegeben (entweder aus Quelle übernommen
  // oder aus description abgeleitet).
  shortDescription?: string;
  instructions?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  cuisine?: string;
  // Kommagetrennte Liste; Werte aus MEAL_TYPE_OPTIONS (food) oder
  // DRINK_TYPE_OPTIONS (drink) — der Kontext wird der KI beim Aufruf
  // mitgegeben, sie wählt also nicht selbst, was food/drink ist.
  mealType?: string;
  // Tag-Namen aus den geseedeten Kategorien; case-insensitiv gemappt.
  tags?: string[];
  imageUri?: string;
  sourceUrl?: string;
  ingredients?: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  }>;
  confidence?: number;
};

export async function extractFromPhoto(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp" | undefined,
  kind: "food" | "drink",
): Promise<ApiResult<ExtractedRecipe>> {
  return request("/extract/photo", {
    method: "POST",
    body: JSON.stringify({ imageBase64, mimeType, kind }),
  });
}

export async function extractFromUrl(
  url: string,
  kind: "food" | "drink",
): Promise<ApiResult<ExtractedRecipe>> {
  return request("/extract/url", {
    method: "POST",
    body: JSON.stringify({ url, kind }),
  });
}

export async function extractFromPdf(
  pdfBase64: string,
  kind: "food" | "drink",
): Promise<ApiResult<ExtractedRecipe>> {
  return request("/extract/pdf", {
    method: "POST",
    body: JSON.stringify({ pdfBase64, kind }),
  });
}

export type NutritionResult = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  missingIngredients: string[];
};

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Berechnet Nährwerte für eine Zutaten-Liste — pro Portion.
 *
 * Hybrid-Ansatz: Zutaten mit BLS-Code werden auf dem Gerät aus der lokalen
 * `bls_foods`-Tabelle berechnet (exakt, offline). Nur die Zutaten OHNE Code
 * (frei getippt / Markenprodukte) gehen an das Backend, das per Open Food
 * Facts nachschaut. Beide Teile werden zusammengezählt.
 *
 * Bonus: Wenn alle Zutaten BLS-Codes haben, läuft die Berechnung komplett
 * offline. Und wenn das Backend nicht erreichbar ist, kriegt der User
 * wenigstens den lokalen Anteil + die anderen werden als fehlend gemeldet.
 */
export async function calculateNutrition(
  ingredients: Array<NutritionInputIngredient>,
  servings: number,
): Promise<ApiResult<NutritionResult>> {
  const s = Math.max(1, servings);

  // 1. Lokaler BLS-Anteil — synchroner SQLite-Lookup je Zutat.
  const local = computeBlsTotals(ingredients);

  // 2. Wenn alles BLS-codiert ist, sparen wir uns den Backend-Call komplett.
  if (local.uncodedIngredients.length === 0) {
    return {
      ok: true,
      data: {
        calories: round(local.calories / s),
        proteinG: round(local.proteinG / s),
        carbsG: round(local.carbsG / s),
        fatG: round(local.fatG / s),
        fiberG: round(local.fiberG / s),
        sugarG: round(local.sugarG / s),
        missingIngredients: local.missing,
      },
    };
  }

  // 3. Sonst: NUR die nicht-codierten Zutaten an das Backend (OFF-Fallback).
  //    Das Backend liefert bereits pro Portion zurück; lokal teilen wir
  //    ebenfalls durch s und addieren — Mathematik passt.
  const backend = await request<NutritionResult>("/nutrition/calculate", {
    method: "POST",
    body: JSON.stringify({ ingredients: local.uncodedIngredients, servings: s }),
  });

  if (!backend.ok) {
    // Backend tot? Liefere wenigstens den lokalen Teil + flagge die Rest-
    // Zutaten als fehlend, damit der User sieht, dass die Werte unvollständig
    // sind. Lieber teilweise Werte als gar keine.
    return {
      ok: true,
      data: {
        calories: round(local.calories / s),
        proteinG: round(local.proteinG / s),
        carbsG: round(local.carbsG / s),
        fatG: round(local.fatG / s),
        fiberG: round(local.fiberG / s),
        sugarG: round(local.sugarG / s),
        missingIngredients: [
          ...local.missing,
          ...local.uncodedIngredients.map((i) => i.name),
        ],
      },
    };
  }

  // 4. Beide Anteile pro Portion summieren.
  return {
    ok: true,
    data: {
      calories: round(local.calories / s + backend.data.calories),
      proteinG: round(local.proteinG / s + backend.data.proteinG),
      carbsG: round(local.carbsG / s + backend.data.carbsG),
      fatG: round(local.fatG / s + backend.data.fatG),
      fiberG: round(local.fiberG / s + backend.data.fiberG),
      sugarG: round(local.sugarG / s + backend.data.sugarG),
      missingIngredients: [
        ...local.missing,
        ...backend.data.missingIngredients,
      ],
    },
  };
}
